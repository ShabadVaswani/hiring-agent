"use client";

import {
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type CategoryScore = { score: number; max: number; evidence: string };

type Evaluation = {
  scores: {
    open_source: CategoryScore;
    self_projects: CategoryScore;
    production: CategoryScore;
    technical_skills: CategoryScore;
  };
  bonus_points: { total: number; breakdown: string };
  deductions: { total: number; reasons: string };
  key_strengths: string[];
  areas_for_improvement: string[];
};

type GithubProject = {
  name?: string | null;
  description?: string | null;
  github_url?: string | null;
  live_url?: string | null;
  technologies?: string[];
  project_type?: string;
  author_commit_count?: number;
  github_details?: { stars?: number; forks?: number; language?: string | null };
};

type GithubData = {
  profile?: {
    username: string;
    name?: string | null;
    bio?: string | null;
    public_repos?: number | null;
    followers?: number | null;
    following?: number | null;
    avatar_url?: string | null;
  };
  projects: GithubProject[];
  total_projects: number;
};

type PipelineResult = {
  resumeText: string;
  resumeData: unknown;
  githubData: GithubData | null;
  evaluation: Evaluation;
  candidateName: string;
  score: number;
  maxScore: number;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  result?: PipelineResult;
};

const RECOMMENDED_MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini Flash Lite" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
];

const STAGES = [
  "Extracting text from PDF",
  "Parsing resume sections",
  "Enriching with GitHub",
  "Evaluating & scoring",
];

const UPSTREAM_REPO =
  "https://github.com/interviewstreet/hiring-agent";

const CATEGORY_META: Record<string, { label: string }> = {
  open_source: { label: "Open Source" },
  self_projects: { label: "Self Projects" },
  production: { label: "Production Experience" },
  technical_skills: { label: "Technical Skills" },
};

function scoreColor(pct: number): string {
  if (pct >= 0.66) return "var(--good)";
  if (pct >= 0.33) return "var(--warn)";
  return "var(--bad)";
}

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const color = scoreColor(pct);
  return (
    <div className="ring">
      <svg width="132" height="132">
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth="11"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div className="ring-center">
        <div>
          <div className="ring-score" style={{ color }}>
            {Math.round(score)}
          </div>
          <div className="ring-max">/ {max}</div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ name, data }: { name: string; data: CategoryScore }) {
  const meta = CATEGORY_META[name] ?? { label: name };
  const pct = data.max > 0 ? Math.max(0, Math.min(1, data.score / data.max)) : 0;
  const color = scoreColor(pct);
  return (
    <div className="cat">
      <div className="cat-top">
        <span className="cat-name">{meta.label}</span>
        <span className="cat-score">
          <b>{data.score}</b> / {data.max}
        </span>
      </div>
      <div className="cat-bar">
        <div
          className="cat-bar-fill"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      {data.evidence ? <p className="cat-evidence">{data.evidence}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(RECOMMENDED_MODELS[0].id);
  const [customModel, setCustomModel] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubUrlOverride, setGithubUrlOverride] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<PipelineResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshGithubSession = useCallback(async () => {
    setGithubLoading(true);
    try {
      const res = await fetch("/api/auth/github/session");
      const data = (await res.json()) as { connected?: boolean; login?: string };
      setGithubLogin(data.connected && data.login ? data.login : null);
    } catch {
      setGithubLogin(null);
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : prefersDark
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.setAttribute(
      "data-theme",
      initial === "dark" ? "dark" : "light",
    );
  }, []);

  useEffect(() => {
    refreshGithubSession();

    const params = new URLSearchParams(window.location.search);
    const status = params.get("github");
    const message = params.get("message");
    if (status === "connected") {
      refreshGithubSession();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "error") {
      setError(message || "GitHub connection failed.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refreshGithubSession]);

  const connectGithub = () => {
    window.location.href = "/api/auth/github";
  };

  const disconnectGithub = async () => {
    await fetch("/api/auth/github/disconnect", { method: "POST" });
    setGithubLogin(null);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "dark" ? "dark" : "light",
    );
    localStorage.setItem("theme", next);
  };

  const effectiveModel = useCustom ? customModel.trim() : model;

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please upload a resume PDF first.");
      return;
    }
    if (!openRouterApiKey.trim()) {
      setError("Please provide your OpenRouter API key.");
      return;
    }
    if (!effectiveModel) {
      setError("Please choose or enter a model.");
      return;
    }

    setIsSubmitting(true);
    setStageIndex(0);
    stageTimer.current = setInterval(() => {
      setStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 4500);

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("openRouterApiKey", openRouterApiKey.trim());
      form.set("model", effectiveModel);
      if (githubUrlOverride.trim()) {
        form.set("githubUrlOverride", githubUrlOverride.trim());
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${basePath}/api/score`, { method: "POST", body: form });
      const json = (await res.json()) as ApiResponse;

      if (res.ok && json.ok && json.result) {
        setResult(json.result);
      } else {
        setError(json.error || "Pipeline failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
      setIsSubmitting(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluation-${result.candidateName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const evalData = result?.evaluation;

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div className="brand-text">
            <h1>Hiring Agent</h1>
            <p>Resume-to-score evaluation, powered by your own models</p>
          </div>
        </div>
        <div className="masthead-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="masthead-badge">
            <span className="dot" />
            Open source &middot; MIT
          </div>
        </div>
      </header>

      <section className="about" aria-label="About this tool">
        <p className="about-lead">
          Built on{" "}
          <a href={UPSTREAM_REPO} target="_blank" rel="noreferrer">
            Hiring Agent
          </a>
          , HackerRank&apos;s open-source resume evaluation pipeline — the same
          scoring logic used to turn resumes into structured, explainable
          candidate assessments.
        </p>
        <ul className="about-points">
          <li>
            <strong>Open source</strong> — upstream project from HackerRank
            (MIT license)
          </li>
          <li>
            <strong>Structured scoring</strong> — open source, projects,
            production experience, and technical skills with written evidence
          </li>
          <li>
            <strong>Fairness rules</strong> — scores are based on skills and
            work, not school, GPA, or location
          </li>
          <li>
            <strong>Your models</strong> — this web app runs the pipeline via
            OpenRouter with your own API key
          </li>
        </ul>
      </section>

      <div className="layout">
        {/* LEFT: form */}
        <form className="panel panel-pad" onSubmit={onSubmit}>
          <h2 className="panel-title">
            <span className="step-num">1</span> Configure run
          </h2>
          <p className="panel-sub">
            Upload a resume, pick a model, and run the full extraction,
            enrichment, and scoring pipeline.
          </p>

          {/* Dropzone */}
          <div className="field">
            <div className="field-label">Resume PDF</div>
            <div
              className={`dropzone${dragging ? " drag" : ""}${
                file ? " has-file" : ""
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {file ? (
                <div className="file-pill">
                  <span>✓</span>
                  {file.name}
                </div>
              ) : (
                <>
                  <div className="dropzone-icon">📄</div>
                  <div className="dropzone-main">
                    Drop your PDF here, or click to browse
                  </div>
                  <div className="dropzone-sub">PDF up to ~10 MB</div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* API key */}
          <div className="field">
            <div className="field-label">
              OpenRouter API Key
              <span className="field-hint">used per request, never stored</span>
            </div>
            <div className="input-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="field">
            <div className="field-label">
              Model
              <span
                className="field-hint"
                style={{ cursor: "pointer", color: "var(--primary)" }}
                onClick={() => setUseCustom((v) => !v)}
              >
                {useCustom ? "Use presets" : "Use custom"}
              </span>
            </div>
            {useCustom ? (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="provider/model-id"
              />
            ) : (
              <div className="seg">
                {RECOMMENDED_MODELS.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={model === m.id ? "active" : ""}
                    onClick={() => setModel(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <div className="field-label">
              GitHub
              <span className="field-hint">optional · higher API limits</span>
            </div>
            {githubLoading ? (
              <p className="github-hint">Checking GitHub connection…</p>
            ) : githubLogin ? (
              <div className="github-connected">
                <span>
                  Connected as{" "}
                  <span className="github-connected-user">@{githubLogin}</span>
                </span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={disconnectGithub}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={connectGithub}
                >
                  Connect GitHub
                </button>
                <p className="github-hint">
                  Sign in with GitHub to authorize read access. Your token is
                  stored in an encrypted session cookie on this app only.
                </p>
              </>
            )}
          </div>

          {/* Advanced */}
          <div className="field">
            <div className="disclosure">
              <button
                type="button"
                className="disclosure-head"
                onClick={() => setAdvancedOpen((o) => !o)}
              >
                Advanced options
                <span className={`chev${advancedOpen ? " open" : ""}`}>▾</span>
              </button>
              {advancedOpen ? (
                <div className="disclosure-body">
                  <div className="field">
                    <div className="field-label">
                      GitHub URL override
                      <span className="field-hint">if auto-detect misses it</span>
                    </div>
                    <input
                      type="text"
                      value={githubUrlOverride}
                      onChange={(e) => setGithubUrlOverride(e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Running pipeline…" : "Run scoring pipeline"}
          </button>

          <div className="privacy-note">
            <span>🔒</span>
            <span>
              Your OpenRouter key is sent only for the current request and is
              never stored. GitHub access uses an encrypted session cookie after
              you connect.
            </span>
          </div>
        </form>

        {/* RIGHT: results */}
        <div className="results-col">
          {isSubmitting ? (
            <div className="panel panel-pad progress-card">
              <div>
                <h2 className="panel-title">Processing</h2>
                <p className="panel-sub" style={{ marginBottom: 0 }}>
                  This runs multiple model calls server-side and can take a
                  little while.
                </p>
              </div>
              <div className="bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((stageIndex + 1) / STAGES.length) * 100}%`,
                  }}
                />
              </div>
              <div className="stages">
                {STAGES.map((label, i) => {
                  const state =
                    i < stageIndex ? "done" : i === stageIndex ? "active" : "";
                  return (
                    <div key={label} className={`stage ${state}`}>
                      <div className="stage-ico">
                        {i < stageIndex ? "✓" : i + 1}
                      </div>
                      <div className="stage-label">{label}</div>
                      {i === stageIndex ? <div className="spinner" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : error ? (
            <div className="panel panel-pad">
              <div className="alert">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            </div>
          ) : result && evalData ? (
            <div className="results">
              {/* Score hero */}
              <div className="panel panel-pad">
                <div className="score-hero">
                  <ScoreRing score={result.score} max={result.maxScore} />
                  <div className="hero-meta">
                    <h2 className="hero-name">{result.candidateName}</h2>
                    <p className="hero-tag">
                      Overall score {Math.round(result.score)} of{" "}
                      {result.maxScore} category points
                    </p>
                    <div className="chips">
                      {evalData.bonus_points.total > 0 ? (
                        <span className="chip good">
                          +{evalData.bonus_points.total} bonus
                        </span>
                      ) : null}
                      {evalData.deductions.total > 0 ? (
                        <span className="chip bad">
                          −{evalData.deductions.total} deductions
                        </span>
                      ) : null}
                      {result.githubData?.profile ? (
                        <span className="chip">
                          {result.githubData.total_projects} GitHub projects
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="panel panel-pad">
                <h3 className="section-h">Score breakdown</h3>
                {(
                  Object.keys(evalData.scores) as Array<
                    keyof Evaluation["scores"]
                  >
                ).map((key) => (
                  <CategoryRow
                    key={key}
                    name={key}
                    data={evalData.scores[key]}
                  />
                ))}
              </div>

              {/* Bonus / deductions */}
              {evalData.bonus_points.breakdown ||
              evalData.deductions.reasons ? (
                <div className="panel panel-pad">
                  <h3 className="section-h">Bonus &amp; deductions</h3>
                  <div className="kv">
                    {evalData.bonus_points.breakdown ? (
                      <div className="kv-row">
                        <b>Bonus (+{evalData.bonus_points.total}): </b>
                        <span>{evalData.bonus_points.breakdown}</span>
                      </div>
                    ) : null}
                    {evalData.deductions.reasons ? (
                      <div className="kv-row">
                        <b>Deductions (−{evalData.deductions.total}): </b>
                        <span>{evalData.deductions.reasons}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Strengths / improvements */}
              <div className="panel panel-pad">
                <div className="two-col">
                  <div>
                    <h3 className="section-h">Key strengths</h3>
                    <ul className="list">
                      {evalData.key_strengths.map((s, i) => (
                        <li key={i}>
                          <span className="mk" style={{ color: "var(--good)" }}>
                            ✓
                          </span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="section-h">Areas for improvement</h3>
                    <ul className="list">
                      {evalData.areas_for_improvement.map((s, i) => (
                        <li key={i}>
                          <span className="mk" style={{ color: "var(--warn)" }}>
                            →
                          </span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* GitHub */}
              {result.githubData?.profile ? (
                <div className="panel panel-pad">
                  <h3 className="section-h">GitHub enrichment</h3>
                  <div className="gh-head">
                    {result.githubData.profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="gh-avatar"
                        src={result.githubData.profile.avatar_url}
                        alt={result.githubData.profile.username}
                      />
                    ) : null}
                    <div>
                      <div className="gh-name">
                        {result.githubData.profile.name ||
                          result.githubData.profile.username}
                      </div>
                      <div className="gh-sub">
                        @{result.githubData.profile.username} ·{" "}
                        {result.githubData.profile.public_repos ?? 0} repos ·{" "}
                        {result.githubData.profile.followers ?? 0} followers
                      </div>
                    </div>
                  </div>
                  {result.githubData.projects.slice(0, 7).map((p, i) => (
                    <div className="proj" key={i}>
                      <div className="proj-top">
                        <div className="proj-name">
                          {p.github_url ? (
                            <a
                              href={p.github_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {p.name}
                            </a>
                          ) : (
                            p.name
                          )}
                        </div>
                        <span
                          className={`proj-type ${
                            p.project_type === "open_source" ? "os" : "self"
                          }`}
                        >
                          {p.project_type === "open_source"
                            ? "open source"
                            : "self project"}
                        </span>
                      </div>
                      {p.description ? (
                        <p className="proj-desc">{p.description}</p>
                      ) : null}
                      {p.technologies && p.technologies.length > 0 ? (
                        <div className="tech">
                          {p.technologies.map((t, ti) => (
                            <span key={ti}>{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Tools */}
              <div className="panel panel-pad">
                <div className="toolbar">
                  <button type="button" onClick={downloadJson}>
                    ⬇ Download JSON
                  </button>
                  <button type="button" onClick={() => setRawOpen((o) => !o)}>
                    {rawOpen ? "Hide" : "Show"} raw output
                  </button>
                </div>
                {rawOpen ? (
                  <pre className="raw">{JSON.stringify(result, null, 2)}</pre>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="empty">
              <div>
                <div className="empty-icon">📊</div>
                <h3>No evaluation yet</h3>
                <p>
                  Upload a resume and run the pipeline. Your score breakdown,
                  strengths, and GitHub enrichment will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        Based on{" "}
        <a href={UPSTREAM_REPO} target="_blank" rel="noreferrer">
          interviewstreet/hiring-agent
        </a>{" "}
        (MIT &copy; HackerRank) &middot; Web UI powered by OpenRouter
      </footer>
    </div>
  );
}
