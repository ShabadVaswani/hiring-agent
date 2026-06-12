import { readFile } from "node:fs/promises";
import path from "node:path";

const TEMPLATE_FILES: Record<string, string> = {
  basics: "basics.jinja",
  work: "work.jinja",
  education: "education.jinja",
  skills: "skills.jinja",
  projects: "projects.jinja",
  awards: "awards.jinja",
  system_message: "system_message.jinja",
  github_project_selection: "github_project_selection.jinja",
  resume_evaluation_criteria: "resume_evaluation_criteria.jinja",
  resume_evaluation_system_message: "resume_evaluation_system_message.jinja",
};

export class TemplateManager {
  private baseDir: string;
  private cache: Map<string, string>;

  constructor(baseDir = path.join(process.cwd(), "prompts", "templates")) {
    this.baseDir = baseDir;
    this.cache = new Map();
  }

  private async loadTemplate(name: string): Promise<string> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    const filename = TEMPLATE_FILES[name];
    if (!filename) {
      throw new Error(`Unknown template: ${name}`);
    }
    const filePath = path.join(this.baseDir, filename);
    const content = await readFile(filePath, "utf8");
    this.cache.set(name, content);
    return content;
  }

  async renderTemplate(
    name: string,
    variables: Record<string, string> = {},
  ): Promise<string> {
    const template = await this.loadTemplate(name);
    return renderSimpleJinja(template, variables);
  }
}

function renderSimpleJinja(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}
