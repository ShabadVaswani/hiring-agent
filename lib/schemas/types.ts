import { z } from "zod";

export const locationSchema = z
  .object({
    address: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    countryCode: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const profileSchema = z.object({
  network: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  url: z.string(),
});

export const basicsSchema = z
  .object({
    name: z.string().default(""),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    location: locationSchema,
    profiles: z.array(profileSchema).optional().nullable(),
  })
  .partial()
  .optional()
  .nullable();

export const workSchema = z
  .object({
    name: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    highlights: z.array(z.string()).optional().nullable(),
  })
  .partial();

export const educationSchema = z
  .object({
    institution: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    area: z.string().optional().nullable(),
    studyType: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    score: z.string().optional().nullable(),
    courses: z.array(z.string()).optional().nullable(),
  })
  .partial();

export const awardSchema = z
  .object({
    title: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    awarder: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
  })
  .partial();

export const skillSchema = z
  .object({
    name: z.string().optional().nullable(),
    level: z.string().optional().nullable(),
    keywords: z.array(z.string()).optional().nullable(),
  })
  .partial();

export const projectSchema = z
  .object({
    name: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    highlights: z.array(z.string()).optional().nullable(),
    url: z.string().optional().nullable(),
    technologies: z.array(z.string()).optional().nullable(),
    skills: z.array(z.string()).optional().nullable(),
  })
  .partial();

export const jsonResumeSchema = z.object({
  basics: basicsSchema,
  work: z.array(workSchema).optional().nullable(),
  volunteer: z.array(workSchema).optional().nullable(),
  education: z.array(educationSchema).optional().nullable(),
  awards: z.array(awardSchema).optional().nullable(),
  certificates: z.array(z.record(z.any())).optional().nullable(),
  publications: z.array(z.record(z.any())).optional().nullable(),
  skills: z.array(skillSchema).optional().nullable(),
  languages: z.array(z.record(z.any())).optional().nullable(),
  interests: z.array(z.record(z.any())).optional().nullable(),
  references: z.array(z.record(z.any())).optional().nullable(),
  projects: z.array(projectSchema).optional().nullable(),
});

export const categoryScoreSchema = z.object({
  score: z.number().min(0),
  max: z.number().positive(),
  evidence: z.string().min(1),
});

export const evaluationDataSchema = z.object({
  scores: z.object({
    open_source: categoryScoreSchema,
    self_projects: categoryScoreSchema,
    production: categoryScoreSchema,
    technical_skills: categoryScoreSchema,
  }),
  bonus_points: z.object({
    total: z.number().min(0).max(20),
    breakdown: z.string(),
  }),
  deductions: z.object({
    total: z.number().min(0),
    reasons: z.string(),
  }),
  key_strengths: z.array(z.string()).min(1).max(5),
  areas_for_improvement: z.array(z.string()).min(1).max(5),
});

export const githubProfileSchema = z.object({
  username: z.string(),
  name: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  public_repos: z.number().optional().nullable(),
  followers: z.number().optional().nullable(),
  following: z.number().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  blog: z.string().optional().nullable(),
  twitter_username: z.string().optional().nullable(),
  hireable: z.boolean().optional().nullable(),
});

export const githubProjectSchema = z.object({
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  github_url: z.string().optional().nullable(),
  live_url: z.string().optional().nullable(),
  technologies: z.array(z.string()).default([]),
  project_type: z.enum(["open_source", "self_project"]).default("self_project"),
  contributor_count: z.number().default(1),
  author_commit_count: z.number().default(0),
  total_commit_count: z.number().default(0),
  reason_for_project_selection: z.string().optional().nullable(),
  github_details: z.record(z.any()).default({}),
});

export const githubDataSchema = z.object({
  profile: githubProfileSchema.optional(),
  projects: z.array(githubProjectSchema).default([]),
  total_projects: z.number().default(0),
});

export type JSONResume = z.infer<typeof jsonResumeSchema>;
export type EvaluationData = z.infer<typeof evaluationDataSchema>;
export type GitHubData = z.infer<typeof githubDataSchema>;
