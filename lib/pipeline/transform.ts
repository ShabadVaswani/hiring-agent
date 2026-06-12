import type { GitHubData, JSONResume } from "@/lib/schemas/types";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return typeof value === "object" && value !== null ? (value as AnyRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function extractDomainFromUrl(url: string): string {
  try {
    const normalized = url.includes("://") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function networkNameFromDomain(domain: string): string {
  const map: Record<string, string> = {
    "github.com": "GitHub",
    "linkedin.com": "LinkedIn",
    "leetcode.com": "LeetCode",
    "stackoverflow.com": "Stack Overflow",
    "hackerrank.com": "HackerRank",
    "behance.net": "Behance",
    "dev.to": "DEV Community",
    "twitter.com": "X",
    "x.com": "X",
  };
  return map[domain] ?? "";
}

function usernameFromUrl(url: string, domain: string): string {
  try {
    const normalized = url.includes("://") ? url : `https://${url}`;
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    if (domain === "linkedin.com" && parts.length > 1) return parts[1];
    if (domain === "stackoverflow.com" && parts.length > 2) return parts[2];
    return parts[0];
  } catch {
    return "";
  }
}

function transformBasics(input: unknown): AnyRecord {
  const basics = asRecord(input);
  const rawProfiles = asArray(basics.profiles);
  const profiles = rawProfiles.map((p) => {
    const profile = asRecord(p);
    const url = toStringOrNull(profile.url) ?? "";
    const network = toStringOrNull(profile.network);
    const username = toStringOrNull(profile.username);
    if (url && !network) {
      const domain = extractDomainFromUrl(url);
      return {
        ...profile,
        network: networkNameFromDomain(domain) || null,
        username: username || usernameFromUrl(url, domain) || null,
      };
    }
    return profile;
  });
  return { ...basics, profiles };
}

function parseDateRange(dateRange: string): { startDate: string | null; endDate: string | null } {
  if (!dateRange) return { startDate: null, endDate: null };
  if (dateRange.includes("onwards")) {
    return { startDate: dateRange.replace("onwards", "").trim() || null, endDate: "Present" };
  }
  if (dateRange.includes("-")) {
    const parts = dateRange.split("-").map((p) => p.trim());
    if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
      return { startDate: `${parts[0]}-01`, endDate: `${parts[1]}-12` };
    }
  }
  return { startDate: null, endDate: null };
}

function transformWork(workList: unknown[]): AnyRecord[] {
  return workList
    .map((item) => asRecord(item))
    .map((item) => {
      const description = Array.isArray(item.description)
        ? (item.description as unknown[]).map(String).join(" ")
        : (toStringOrNull(item.description) ?? "");
      const startDateInput = toStringOrNull(item.startDate) ?? "";
      const parsed = parseDateRange(startDateInput);
      return {
        name: toStringOrNull(item.name),
        position: toStringOrNull(item.position) ?? toStringOrNull(item.type) ?? toStringOrNull(item.title),
        url: toStringOrNull(item.url),
        startDate: parsed.startDate ?? toStringOrNull(item.startDate),
        endDate: parsed.endDate ?? toStringOrNull(item.endDate),
        summary: toStringOrNull(item.summary) ?? description,
        highlights: asArray(item.highlights).map(String),
      };
    });
}

function transformEducation(eduList: unknown[]): AnyRecord[] {
  return eduList.map((item) => {
    const row = asRecord(item);
    return {
      institution: toStringOrNull(row.institution),
      url: toStringOrNull(row.url),
      area: toStringOrNull(row.area) ?? toStringOrNull(row.degree),
      studyType: toStringOrNull(row.studyType),
      startDate: toStringOrNull(row.startDate),
      endDate: toStringOrNull(row.endDate),
      score: toStringOrNull(row.score) ?? toStringOrNull(row.gpa) ?? toStringOrNull(row.percentage),
      courses: asArray(row.courses).map(String),
    };
  });
}

function transformSkillsComprehensive(parsedData: AnyRecord): AnyRecord[] {
  const skills: AnyRecord[] = [];
  const skillRows = asArray(parsedData.skills);
  if (skillRows.length > 0) {
    if (typeof skillRows[0] === "string") {
      skills.push({
        name: "Programming Languages",
        level: null,
        keywords: skillRows.map(String),
      });
    } else {
      skills.push(
        ...skillRows.map((row) => {
          const r = asRecord(row);
          return {
            name: toStringOrNull(r.name),
            level: toStringOrNull(r.level),
            keywords: asArray(r.keywords).map(String),
          };
        }),
      );
    }
  }

  const categories: Record<string, string> = {
    librariesFrameworks: "Libraries/Frameworks",
    toolsPlatforms: "Tools/Platforms",
    databases: "Databases",
  };
  for (const [key, name] of Object.entries(categories)) {
    const value = asArray(parsedData[key]);
    if (value.length > 0) {
      skills.push({ name, level: null, keywords: value.map(String) });
    }
  }

  return skills;
}

function transformProjectsComprehensive(parsedData: AnyRecord): AnyRecord[] {
  const projects = asArray(parsedData.projects).map((row) => {
    const p = asRecord(row);
    const technologies = asArray(p.technologies).map(String);
    return {
      name: toStringOrNull(p.name),
      startDate: toStringOrNull(p.startDate),
      endDate: toStringOrNull(p.endDate),
      description: toStringOrNull(p.description),
      highlights: asArray(p.highlights).map(String),
      url: toStringOrNull(p.url),
      technologies,
      skills: asArray(p.skills).map(String),
    };
  });

  const openSourceRows = asArray(parsedData.projectsOpenSource);
  for (const row of openSourceRows) {
    const p = asRecord(row);
    projects.push({
      name: toStringOrNull(p.name),
      startDate: null,
      endDate: null,
      description: toStringOrNull(p.summary) ?? toStringOrNull(p.description),
      highlights: [],
      url: toStringOrNull(p.url),
      technologies: asArray(p.technologies).map(String),
      skills: [],
    });
  }

  return projects;
}

export function transformParsedData(parsedData: unknown): AnyRecord {
  const parsed = asRecord(parsedData);

  if ("basics" in parsed && Object.keys(parsed).length > 1) {
    return {
      basics: transformBasics(parsed.basics),
      work: transformWork(
        asArray(
          parsed.work_experience ??
            parsed.work ??
            parsed.experience,
        ),
      ),
      volunteer: asArray(parsed.organizations).map((item) => {
        const i = asRecord(item);
        return {
          organization: toStringOrNull(i.name),
          position: toStringOrNull(i.role),
          url: toStringOrNull(i.url),
          startDate: null,
          endDate: "Present",
          summary: null,
          highlights: [],
        };
      }),
      education: transformEducation(asArray(parsed.education)),
      awards: asArray(parsed.achievements ?? parsed.awards ?? parsed.honors_and_awards).map((row) => {
        const r = asRecord(row);
        return {
          title: toStringOrNull(r.title) ?? toStringOrNull(r.name),
          date: toStringOrNull(r.date),
          awarder: toStringOrNull(r.awarder) ?? toStringOrNull(r.organization),
          summary: toStringOrNull(r.summary),
        };
      }),
      certificates: asArray(parsed.certificates),
      publications: asArray(parsed.publications),
      skills: transformSkillsComprehensive(parsed),
      languages: asArray(parsed.languages),
      interests: asArray(parsed.interests),
      references: asArray(parsed.references),
      projects: transformProjectsComprehensive(parsed),
    };
  }

  if ("basics" in parsed) return { basics: transformBasics(parsed.basics ?? parsed) };
  if ("work" in parsed || "work_experience" in parsed || "experience" in parsed) {
    return { work: transformWork(asArray(parsed.work ?? parsed.work_experience ?? parsed.experience)) };
  }
  if ("education" in parsed) return { education: transformEducation(asArray(parsed.education)) };
  if ("skills" in parsed || "librariesFrameworks" in parsed || "toolsPlatforms" in parsed || "databases" in parsed) {
    return { skills: transformSkillsComprehensive(parsed) };
  }
  if ("projects" in parsed || "projectsOpenSource" in parsed) {
    return { projects: transformProjectsComprehensive(parsed) };
  }
  if ("awards" in parsed || "achievements" in parsed || "honors_and_awards" in parsed) {
    return {
      awards: asArray(parsed.awards ?? parsed.achievements ?? parsed.honors_and_awards),
    };
  }
  return parsed;
}

export function mergeSectionsToResume(
  sections: Partial<JSONResume>[],
): JSONResume {
  const base: JSONResume = {
    basics: null,
    work: null,
    volunteer: null,
    education: null,
    awards: null,
    certificates: null,
    publications: null,
    skills: null,
    languages: null,
    interests: null,
    references: null,
    projects: null,
  };

  for (const section of sections) {
    for (const [key, value] of Object.entries(section)) {
      (base as Record<string, unknown>)[key] = value;
    }
  }

  return base;
}

export function convertJsonResumeToText(resumeData: JSONResume): string {
  const textParts: string[] = [];
  const basics = resumeData.basics;
  if (basics) {
    textParts.push("=== BASIC INFORMATION ===");
    textParts.push(`Name: ${basics.name || "Not provided"}`);
    textParts.push(`Email: ${basics.email || "Not provided"}`);
    textParts.push(`Phone: ${basics.phone || "Not provided"}`);
    textParts.push(`Website: ${basics.url || "Not provided"}`);
    if (basics.summary) textParts.push(`Summary: ${basics.summary}`);
    if (basics.location) {
      const parts = [
        basics.location.address,
        basics.location.city,
        basics.location.region,
        basics.location.postalCode,
        basics.location.countryCode,
      ].filter(Boolean);
      if (parts.length > 0) textParts.push(`Location: ${parts.join(", ")}`);
    }
    if (basics.profiles?.length) {
      textParts.push("Profiles:");
      for (const profile of basics.profiles) {
        textParts.push(
          `  - ${profile.network ?? "Profile"}: ${profile.username ?? "N/A"} (${profile.url})`,
        );
      }
    }
  }

  if (resumeData.work?.length) {
    textParts.push("\n=== WORK EXPERIENCE ===");
    resumeData.work.forEach((work, idx) => {
      textParts.push(`${idx + 1}. ${work.position ?? "N/A"} at ${work.name ?? "N/A"}`);
      textParts.push(`   Period: ${work.startDate ?? "N/A"} - ${work.endDate ?? "N/A"}`);
      if (work.url) textParts.push(`   Website: ${work.url}`);
      if (work.summary) textParts.push(`   Description: ${work.summary}`);
      if (work.highlights?.length) {
        textParts.push("   Key Achievements:");
        for (const h of work.highlights) textParts.push(`     - ${h}`);
      }
    });
  }

  if (resumeData.education?.length) {
    textParts.push("\n=== EDUCATION ===");
    resumeData.education.forEach((edu, idx) => {
      textParts.push(`${idx + 1}. ${edu.studyType ?? "N/A"} in ${edu.area ?? "N/A"}`);
      textParts.push(`   Institution: ${edu.institution ?? "N/A"}`);
      textParts.push(`   Period: ${edu.startDate ?? "N/A"} - ${edu.endDate ?? "N/A"}`);
      if (edu.score) textParts.push(`   Score: ${edu.score}`);
      if (edu.url) textParts.push(`   Website: ${edu.url}`);
    });
  }

  if (resumeData.skills?.length) {
    textParts.push("\n=== SKILLS ===");
    for (const skill of resumeData.skills) {
      textParts.push(`- ${skill.name ?? "Skills"}`);
      if (skill.level) textParts.push(`  Level: ${skill.level}`);
      if (skill.keywords?.length) textParts.push(`  Keywords: ${skill.keywords.join(", ")}`);
    }
  }

  if (resumeData.projects?.length) {
    textParts.push("\n=== PROJECTS ===");
    resumeData.projects.forEach((project, idx) => {
      textParts.push(`${idx + 1}. ${project.name ?? "N/A"}`);
      if (project.description) textParts.push(`   Description: ${project.description}`);
      if (project.url) textParts.push(`   URL: ${project.url}`);
      if (project.technologies?.length) {
        textParts.push(`   Technologies: ${project.technologies.join(", ")}`);
      }
    });
  }

  if (resumeData.awards?.length) {
    textParts.push("\n=== AWARDS ===");
    for (const award of resumeData.awards) {
      textParts.push(
        `- ${award.title ?? "N/A"} - ${award.awarder ?? "N/A"} (${award.date ?? "N/A"})`,
      );
    }
  }

  return textParts.join("\n");
}

export function convertGithubDataToText(githubData: GitHubData): string {
  let text = "\n\n=== GITHUB DATA ===\n";
  if (githubData.profile) {
    text += "GitHub Profile:\n";
    text += `- Username: ${githubData.profile.username ?? "N/A"}\n`;
    text += `- Name: ${githubData.profile.name ?? "N/A"}\n`;
    text += `- Bio: ${githubData.profile.bio ?? "N/A"}\n`;
    text += `- Public Repositories: ${githubData.profile.public_repos ?? "N/A"}\n`;
    text += `- Followers: ${githubData.profile.followers ?? "N/A"}\n`;
    text += `- Following: ${githubData.profile.following ?? "N/A"}\n`;
  }

  if (githubData.projects?.length) {
    text += `\nGitHub Projects (${githubData.projects.length} total):\n`;
    githubData.projects.slice(0, 10).forEach((project, idx) => {
      text += `${idx + 1}. ${project.name ?? "N/A"}\n`;
      text += `   Description: ${project.description ?? "N/A"}\n`;
      text += `   URL: ${project.github_url ?? "N/A"}\n`;
      text += `   Project Type: ${project.project_type}\n`;
      text += `   Author Commits: ${project.author_commit_count}\n`;
      text += `   Total Commits: ${project.total_commit_count}\n`;
      text += `   Stars: ${project.github_details?.stars ?? "N/A"}\n`;
      text += `   Forks: ${project.github_details?.forks ?? "N/A"}\n\n`;
    });
  }
  return text;
}
