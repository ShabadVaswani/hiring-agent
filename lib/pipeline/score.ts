import { fetchAndSelectGithubInfo } from "@/lib/github/client";
import { openRouterChat, parseJsonFromModelText } from "@/lib/openrouter/client";
import { extractPdfText } from "@/lib/pdf/extract";
import { TemplateManager } from "@/lib/prompts/loader";
import {
  evaluationDataSchema,
  jsonResumeSchema,
  type EvaluationData,
  type GitHubData,
  type JSONResume,
} from "@/lib/schemas/types";
import type { OpenRouterAuthMode } from "@/lib/rate-limit/openrouter";
import {
  convertGithubDataToText,
  convertJsonResumeToText,
  mergeSectionsToResume,
  transformParsedData,
} from "@/lib/pipeline/transform";

type ScoreInput = {
  fileBuffer: Buffer;
  fileName: string;
  openRouterApiKey: string;
  model: string;
  githubToken?: string;
  githubUrlOverride?: string;
  githubDataOverride?: GitHubData | null;
  authMode: OpenRouterAuthMode;
  throttleUserId: string;
};

type ExtractionSection =
  | "basics"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "awards";

const SECTION_ORDER: ExtractionSection[] = [
  "basics",
  "work",
  "education",
  "skills",
  "projects",
  "awards",
];

const MODEL_PARAMETERS: Record<string, { temperature: number; top_p: number }> = {
  "google/gemini-2.5-flash": { temperature: 0.1, top_p: 0.9 },
  "google/gemini-2.5-flash-lite": { temperature: 0.1, top_p: 0.9 },
  "openai/gpt-4o-mini": { temperature: 0.1, top_p: 0.9 },
  "google/gemma-4-26b-a4b-it:free": { temperature: 0.1, top_p: 0.9 },
  "meta-llama/llama-3.2-3b-instruct:free": { temperature: 0.1, top_p: 0.9 },
};

function modelParamsFor(model: string): { temperature: number; top_p: number } {
  return MODEL_PARAMETERS[model] ?? { temperature: 0.1, top_p: 0.9 };
}

function findProfileByNetwork(
  resumeData: JSONResume,
  network: string,
): string | null {
  const profiles = resumeData.basics?.profiles ?? [];
  for (const profile of profiles) {
    if ((profile.network ?? "").toLowerCase() === network.toLowerCase()) {
      return profile.url;
    }
  }
  return null;
}

async function extractSection(
  templateManager: TemplateManager,
  sectionName: ExtractionSection,
  resumeText: string,
  model: string,
  apiKey: string,
  context: { authMode: OpenRouterAuthMode; throttleUserId: string },
): Promise<Partial<JSONResume>> {
  const sectionPrompt = await templateManager.renderTemplate(sectionName, {
    text_content: resumeText,
  });
  const sectionSystemMessage = await templateManager.renderTemplate("system_message", {
    section_name_param: sectionName,
  });
  const modelParams = modelParamsFor(model);

  const content = await openRouterChat({
    apiKey,
    model,
    temperature: modelParams.temperature,
    top_p: modelParams.top_p,
    authMode: context.authMode,
    throttleUserId: context.throttleUserId,
    responseFormat: "json_object",
    messages: [
      { role: "system", content: sectionSystemMessage },
      { role: "user", content: sectionPrompt },
    ],
  });

  const parsed = parseJsonFromModelText<unknown>(content);
  const transformed = transformParsedData(parsed);
  return transformed as Partial<JSONResume>;
}

async function evaluateResume(
  templateManager: TemplateManager,
  resumeText: string,
  model: string,
  apiKey: string,
  context: { authMode: OpenRouterAuthMode; throttleUserId: string },
): Promise<EvaluationData> {
  const systemMessage = await templateManager.renderTemplate(
    "resume_evaluation_system_message",
  );
  const evalPrompt = await templateManager.renderTemplate(
    "resume_evaluation_criteria",
    { text_content: resumeText },
  );
  const modelParams = modelParamsFor(model);

  const content = await openRouterChat({
    apiKey,
    model,
    temperature: modelParams.temperature,
    top_p: modelParams.top_p,
    authMode: context.authMode,
    throttleUserId: context.throttleUserId,
    responseFormat: "json_object",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: evalPrompt },
    ],
  });

  const parsed = parseJsonFromModelText<unknown>(content);
  return evaluationDataSchema.parse(parsed);
}

export async function scoreResumePipeline(input: ScoreInput): Promise<{
  resumeText: string;
  resumeData: JSONResume;
  githubData: GitHubData | null;
  evaluation: EvaluationData;
  candidateName: string;
  score: number;
  maxScore: number;
}> {
  const templateManager = new TemplateManager();
  const resumeText = await extractPdfText(input.fileBuffer);
  if (!resumeText?.trim()) {
    throw new Error("Failed to extract text from PDF");
  }

  const sectionOutputs: Partial<JSONResume>[] = [];
  for (const sectionName of SECTION_ORDER) {
    const section = await extractSection(
      templateManager,
      sectionName,
      resumeText,
      input.model,
      input.openRouterApiKey,
      input,
    );
    sectionOutputs.push(section);
  }

  const mergedResume = mergeSectionsToResume(sectionOutputs);
  const resumeData = jsonResumeSchema.parse(mergedResume);

  let githubData: GitHubData | null = null;
  if (input.githubDataOverride) {
    githubData = input.githubDataOverride;
  } else {
    const githubUrl =
      input.githubUrlOverride || findProfileByNetwork(resumeData, "github");
    if (githubUrl) {
      githubData = await fetchAndSelectGithubInfo(
        githubUrl,
        {
          apiKey: input.openRouterApiKey,
          model: input.model,
          ...modelParamsFor(input.model),
          authMode: input.authMode,
          throttleUserId: input.throttleUserId,
        },
        input.githubToken,
      );
    }
  }

  let evaluationInputText = convertJsonResumeToText(resumeData);
  if (githubData) {
    evaluationInputText += convertGithubDataToText(githubData);
  }

  const evaluation = await evaluateResume(
    templateManager,
    evaluationInputText,
    input.model,
    input.openRouterApiKey,
    input,
  );

  const maxScore =
    evaluation.scores.open_source.max +
    evaluation.scores.self_projects.max +
    evaluation.scores.production.max +
    evaluation.scores.technical_skills.max;

  const score =
    Math.min(evaluation.scores.open_source.score, evaluation.scores.open_source.max) +
    Math.min(
      evaluation.scores.self_projects.score,
      evaluation.scores.self_projects.max,
    ) +
    Math.min(evaluation.scores.production.score, evaluation.scores.production.max) +
    Math.min(
      evaluation.scores.technical_skills.score,
      evaluation.scores.technical_skills.max,
    ) +
    evaluation.bonus_points.total -
    evaluation.deductions.total;

  return {
    resumeText,
    resumeData,
    githubData,
    evaluation,
    candidateName: resumeData.basics?.name || input.fileName.replace(".pdf", ""),
    score,
    maxScore,
  };
}
