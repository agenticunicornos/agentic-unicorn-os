const MAX_BODY_BYTES = 50_000;
const MAX_PROMPT_CHARS = 1_200;
const MAX_OUTPUT_CHARS = 8_000;
const AUTH_TIMEOUT_MS = 8_000;
const MODEL_TIMEOUT_MS = 25_000;

export const config = {
  path: "/api/agent",
  method: ["POST", "OPTIONS"],
  rateLimit: {
    action: "rate_limit",
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};

export default async function handler(request) {
  const requestOrigin = request.headers.get("origin") || "";
  const sameOrigin = new URL(request.url).origin;
  const corsOrigin = requestOrigin && requestOrigin === sameOrigin ? requestOrigin : "";

  if (requestOrigin && !corsOrigin) {
    return json(403, { error: "Origin not allowed" }, "");
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(corsOrigin, true)
    });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" }, corsOrigin);
  }

  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    return json(415, { error: "Content-Type must be application/json" }, corsOrigin);
  }

  const rawBody = await request.text();
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json(413, { error: "Request too large" }, corsOrigin);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const provider = resolveProvider();
  const model = resolveModel(provider);

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: "Supabase server config missing" });
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return json(401, { error: "Authentication required" }, corsOrigin);
  }

  const user = await verifySupabaseUser(supabaseUrl, supabaseAnonKey, token).catch(() => null);
  if (!user) {
    return json(401, { error: "Invalid session" }, corsOrigin);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Invalid JSON" }, corsOrigin);
  }

  const prompt = cleanText(payload.prompt).slice(0, MAX_PROMPT_CHARS);
  const mode = ["operator", "pipeline", "risk"].includes(payload.mode) ? payload.mode : "operator";
  const workspace = compactWorkspace(payload.workspace);

  if (!prompt) {
    return json(400, { error: "Prompt required" }, corsOrigin);
  }

  const agentInput = {
    userId: user.id,
    mode,
    prompt,
    workspace
  };
  const system = [
    "You are AGU.OS, an agentic operating system for a founder.",
    "Use the workspace context. Be decisive, operational, and concrete.",
    "Return concise French output with exactly: Decision, Plan, Risks, Next command.",
    "Do not invent missing data. If a data gap matters, name it as a risk."
  ].join("\n");

  let result;
  try {
    result = await runModel(provider, model, system, agentInput);
  } catch (error) {
    console.error(JSON.stringify({
      event: "agent_provider_failure",
      provider,
      model,
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown"
    }));
    result = {
      answer: `${localAgentAnswer(agentInput)}\n\nLe fournisseur distant est temporairement indisponible. Une réponse locale sécurisée a été utilisée.`,
      provider,
      local: true
    };
  }

  return json(200, {
    answer: cleanText(result.answer).slice(0, MAX_OUTPUT_CHARS),
    model,
    mode,
    provider: result.provider,
    local: result.local
  }, corsOrigin);
}

function json(status, body, corsOrigin = "") {
  return Response.json(body, {
    status,
    headers: responseHeaders(corsOrigin)
  });
}

function responseHeaders(corsOrigin, preflight = false) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Vary": "Origin"
  };
  if (corsOrigin) headers["Access-Control-Allow-Origin"] = corsOrigin;
  if (preflight) {
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

function bearerToken(value) {
  if (!value || typeof value !== "string") return "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function verifySupabaseUser(supabaseUrl, supabaseAnonKey, token) {
  const response = await fetchWithTimeout(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey
    }
  }, AUTH_TIMEOUT_MS);

  if (!response.ok) return null;
  return response.json();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveProvider() {
  const requested = cleanText(process.env.LLM_PROVIDER).toLowerCase();
  if (["openai", "openrouter", "custom", "ollama", "local", "none"].includes(requested)) {
    return requested === "none" ? "local" : requested;
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.LLM_BASE_URL) return "custom";
  return "local";
}

function resolveModel(provider) {
  if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
  if (provider === "ollama") return "llama3.1";
  if (provider === "openrouter") return "openai/gpt-4.1-mini";
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

async function runModel(provider, model, system, input) {
  if (provider === "local") {
    return {
      answer: localAgentAnswer(input),
      provider: "local",
      local: true
    };
  }

  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
    if (!key) return missingKey("openai", input);
    return runOpenAIResponses({ key, model, system, input });
  }

  if (provider === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY;
    if (!key) return missingKey("openrouter", input);
    return runChatCompletions({
      provider: "openrouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      key,
      model,
      system,
      input
    });
  }

  if (provider === "ollama") {
    const baseUrl = cleanText(process.env.LLM_BASE_URL || process.env.OLLAMA_BASE_URL);
    if (!baseUrl) return missingBaseUrl("ollama", input);
    return runOllama({ baseUrl, model, system, input });
  }

  const baseUrl = cleanText(process.env.LLM_BASE_URL);
  if (!baseUrl) return missingBaseUrl("custom", input);
  return runChatCompletions({
    provider: "custom",
    endpoint: `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
    key: process.env.LLM_API_KEY || "",
    model,
    system,
    input
  });
}

function missingKey(provider, input) {
  return {
    answer: `${localAgentAnswer(input)}\n\nProvider ${provider} configured, but no API key is set. Add LLM_API_KEY or the provider-specific key in Netlify.`,
    provider,
    local: true
  };
}

function missingBaseUrl(provider, input) {
  return {
    answer: `${localAgentAnswer(input)}\n\nProvider ${provider} configured, but LLM_BASE_URL is missing.`,
    provider,
    local: true
  };
}

async function runOpenAIResponses({ key, model, system, input }) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(input) }] }],
      max_output_tokens: 900
    })
  }, MODEL_TIMEOUT_MS);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed");
  }

  return {
    answer: extractResponsesText(data),
    provider: "openai",
    local: false
  };
}

async function runChatCompletions({ provider, endpoint, key, model, system, input }) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) }
      ],
      temperature: 0.3,
      max_tokens: 900
    })
  }, MODEL_TIMEOUT_MS);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `${provider} request failed`);
  }

  return {
    answer: data.choices?.[0]?.message?.content?.trim() || "No LLM output returned.",
    provider,
    local: false
  };
}

async function runOllama({ baseUrl, model, system, input }) {
  const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${system}\n\n${JSON.stringify(input)}`,
      stream: false
    })
  }, MODEL_TIMEOUT_MS);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Ollama request failed");
  }

  return {
    answer: cleanText(data.response) || "No LLM output returned.",
    provider: "ollama",
    local: false
  };
}

function localAgentAnswer(input) {
  const actions = input.workspace.actions || [];
  const openActions = actions.filter((action) => !action.done);
  const dueToday = openActions.filter((action) => /today|now|urgent/i.test(action.due));
  const firstPipeline = Object.entries(input.workspace.pipelines || {})
    .flatMap(([lane, rows]) => rows.map((row) => ({ lane, ...row })))
    .find((row) => row.name);
  const nextAction = dueToday[0] || openActions[0];
  const risks = [];

  if (!firstPipeline) risks.push("Pipeline vide ou peu qualifie.");
  if (openActions.length > 8) risks.push("Trop d'actions ouvertes sans arbitrage.");
  if (!Object.keys(input.workspace.notes || {}).length) risks.push("Dossiers sans notes operateur recentes.");
  if (!risks.length) risks.push("Risque principal: execution non mesuree apres decision.");

  return [
    "Decision",
    nextAction ? `Prioriser: ${nextAction.title}.` : "Creer une action prioritaire avant d'ajouter du bruit.",
    "",
    "Plan",
    firstPipeline
      ? `1. Avancer ${firstPipeline.name} dans ${firstPipeline.lane} avec l'etape: ${firstPipeline.next || "definir la prochaine action"}.`
      : "1. Ajouter une opportunite pipeline avec contrepartie, prochaine etape et signal.",
    nextAction ? `2. Executer l'action ${nextAction.mission} aujourd'hui.` : "2. Transformer le brief en une action datable.",
    "3. Mettre a jour le dossier concerne avec une note de preuve.",
    "",
    "Risks",
    risks.map((risk) => `- ${risk}`).join("\n"),
    "",
    "Next command",
    input.prompt
  ].join("\n");
}

function compactWorkspace(value) {
  const workspace = value && typeof value === "object" ? value : {};
  const actions = Array.isArray(workspace.actions) ? workspace.actions.slice(0, 12) : [];
  const pipelines = workspace.pipelines && typeof workspace.pipelines === "object" ? workspace.pipelines : {};
  const notes = workspace.notes && typeof workspace.notes === "object" ? workspace.notes : {};
  const organization = workspace.organization && typeof workspace.organization === "object" ? workspace.organization : {};
  return {
    organization: {
      name: cleanText(organization.name),
      role: cleanText(organization.role),
      accessState: cleanText(organization.accessState)
    },
    actions: actions.map((item) => ({
      mission: cleanText(item.mission),
      title: cleanText(item.title),
      leverage: cleanText(item.leverage),
      due: cleanText(item.due),
      done: Boolean(item.done)
    })),
    pipelines: Object.fromEntries(
      Object.entries(pipelines).map(([lane, rows]) => [
        lane,
        Array.isArray(rows)
          ? rows.slice(0, 8).map((row) => ({
              name: cleanText(row.name),
              counterparty: cleanText(row.counterparty),
              next: cleanText(row.next),
              signal: cleanText(row.signal)
            }))
          : []
      ])
    ),
    notes: Object.fromEntries(
      Object.entries(notes)
        .slice(0, 8)
        .map(([key, body]) => [key, cleanText(body).slice(0, 600)])
    )
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractResponsesText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }

  return parts.join("\n").trim() || "No LLM output returned.";
}
