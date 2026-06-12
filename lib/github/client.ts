import type { GitHubData } from "@/lib/schemas/types";
import { openRouterChat, parseJsonFromModelText } from "@/lib/openrouter/client";
import { TemplateManager } from "@/lib/prompts/loader";

export type OpenRouterContext = {
  apiKey: string;
  model: string;
  temperature?: number;
  top_p?: number;
};

function extractGithubUsername(githubUrl: string): string | null {
  if (!githubUrl) return null;
  const input = githubUrl.trim().replace(/\s+/g, "");
  const patterns = [
    /https?:\/\/github\.com\/([^/?#]+)/i,
    /github\.com\/([^/?#]+)/i,
    /^@([^/?#]+)$/,
    /^([a-zA-Z0-9-]+)$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchGithubApi<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function fetchRepoContributors(
  owner: string,
  repo: string,
  token?: string,
): Promise<Array<{ login?: string; contributions?: number }>> {
  try {
    return await fetchGithubApi<Array<{ login?: string; contributions?: number }>>(
      `https://api.github.com/repos/${owner}/${repo}/contributors`,
      token,
    );
  } catch {
    return [];
  }
}

export async function fetchAndSelectGithubInfo(
  githubUrl: string,
  context: OpenRouterContext,
  githubToken?: string,
): Promise<GitHubData> {
  const username = extractGithubUsername(githubUrl);
  if (!username) {
    return { projects: [], total_projects: 0 };
  }

  const profile = await fetchGithubApi<Record<string, unknown>>(
    `https://api.github.com/users/${username}`,
    githubToken,
  );

  const repos = await fetchGithubApi<Array<Record<string, unknown>>>(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=all`,
    githubToken,
  );

  const projects: Array<Record<string, unknown>> = [];
  for (const repo of repos) {
    if (repo.fork === true && Number(repo.forks_count ?? 0) < 5) {
      continue;
    }
    const repoName = String(repo.name ?? "");
    const contributors = await fetchRepoContributors(username, repoName, githubToken);
    const contributorCount = contributors.length;
    const ownerContrib = contributors.find(
      (c) => (c.login ?? "").toLowerCase() === username.toLowerCase(),
    );
    const userContributions = Number(ownerContrib?.contributions ?? 0);
    const totalContributions = contributors.reduce(
      (acc, c) => acc + Number(c.contributions ?? 0),
      0,
    );

    projects.push({
      name: repo.name ?? null,
      description: repo.description ?? null,
      github_url: repo.html_url ?? null,
      live_url: repo.homepage ?? null,
      technologies: repo.language ? [repo.language] : [],
      project_type: contributorCount > 1 ? "open_source" : "self_project",
      contributor_count: contributorCount,
      author_commit_count: userContributions,
      total_commit_count: totalContributions,
      github_details: {
        stars: Number(repo.stargazers_count ?? 0),
        forks: Number(repo.forks_count ?? 0),
        language: repo.language ?? null,
        description: repo.description ?? null,
        created_at: repo.created_at ?? null,
        updated_at: repo.updated_at ?? null,
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        open_issues: Number(repo.open_issues_count ?? 0),
        size: Number(repo.size ?? 0),
        fork: Boolean(repo.fork),
        archived: Boolean(repo.archived),
        default_branch: repo.default_branch ?? null,
      },
    });
  }

  const eligibleProjects = projects.filter((p) => Number(p.author_commit_count ?? 0) > 0);
  const templateManager = new TemplateManager();
  const prompt = await templateManager.renderTemplate("github_project_selection", {
    projects_data: JSON.stringify(eligibleProjects, null, 2),
  });

  let selectedProjects = eligibleProjects.slice(0, 7);
  try {
    const content = await openRouterChat({
      apiKey: context.apiKey,
      model: context.model,
      temperature: context.temperature ?? 0.1,
      top_p: context.top_p ?? 0.9,
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical recruiter analyzing GitHub repositories. Respond with only a valid JSON array and no extra text.",
        },
        { role: "user", content: prompt },
      ],
      responseFormat: "json_object",
    });

    const parsed = parseJsonFromModelText<unknown>(content);
    const candidates = Array.isArray(parsed)
      ? parsed
      : (parsed as { projects?: unknown[] }).projects ?? [];
    if (Array.isArray(candidates) && candidates.length > 0) {
      const seen = new Set<string>();
      const deduped: Array<Record<string, unknown>> = [];
      for (const item of candidates) {
        const record = item as Record<string, unknown>;
        const name = String(record.name ?? "");
        if (!name || seen.has(name)) continue;
        seen.add(name);
        deduped.push(record);
        if (deduped.length >= 7) break;
      }
      if (deduped.length > 0) {
        selectedProjects = deduped;
      }
    }
  } catch {
    // fallback already set
  }

  return {
    profile: {
      username,
      name: (profile.name as string | null) ?? null,
      bio: (profile.bio as string | null) ?? null,
      location: (profile.location as string | null) ?? null,
      company: (profile.company as string | null) ?? null,
      public_repos: Number(profile.public_repos ?? 0),
      followers: Number(profile.followers ?? 0),
      following: Number(profile.following ?? 0),
      created_at: (profile.created_at as string | null) ?? null,
      updated_at: (profile.updated_at as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      blog: (profile.blog as string | null) ?? null,
      twitter_username: (profile.twitter_username as string | null) ?? null,
      hireable: Boolean(profile.hireable),
    },
    projects: selectedProjects as GitHubData["projects"],
    total_projects: selectedProjects.length,
  };
}
