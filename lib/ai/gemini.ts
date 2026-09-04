type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
};

/**
 * Free-tier keys have a tiny daily cap on Gemini 3 Flash. Prefer Flash Lite,
 * which accepts the same JSON calls with a higher request budget.
 */
const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3-flash-preview"] as const;

const REQUEST_TIMEOUT_MS = 20_000;

function apiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return key;
}

function isQuotaMessage(message: string) {
  return /quota exceeded|resource.?exhausted|rate.?limit|too many requests/i.test(message);
}

function extractText(payload: GeminiResponse) {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error(payload.error?.message ?? "Gemini returned an empty response.");
  }
  return text;
}

function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw) as T;
}

async function generateOnce(
  model: string,
  prompt: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
  options?: { temperature?: number; maxOutputTokens?: number },
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey(),
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: options?.maxOutputTokens ?? 1536,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

    const payload = (await response.json()) as GeminiResponse;
    const message = payload.error?.message ?? `Gemini ${model} failed (${response.status}).`;
    if (!response.ok) {
      const error = new Error(message);
      if (response.status === 429 || isQuotaMessage(message)) {
        error.name = "GeminiQuotaError";
      }
      throw error;
    }

    return parseJson<unknown>(extractText(payload));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini ${model} timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateJson<T>(
  prompt: string,
  options?: { deadlineMs?: number; temperature?: number; maxOutputTokens?: number },
): Promise<T> {
  let lastError: unknown;
  const deadline = Date.now() + (options?.deadlineMs ?? MODELS.length * REQUEST_TIMEOUT_MS);

  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 1500) {
      break;
    }
    try {
      return (await generateOnce(model, prompt, Math.min(REQUEST_TIMEOUT_MS, remaining), {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
      })) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && (error.name === "GeminiQuotaError" || isQuotaMessage(error.message))) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed.");
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
