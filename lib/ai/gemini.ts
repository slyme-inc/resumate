type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
};

/** Fast Flash models first. Gemini 3 thinks by default and can take tens of seconds. */
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3-flash-preview"] as const;

const REQUEST_TIMEOUT_MS = 12_000;

function apiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return key;
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

async function generateOnce(model: string, prompt: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 4096,
            ...(model === "gemini-2.0-flash"
              ? {}
              : { thinkingConfig: { thinkingBudget: 0 } }),
          },
        }),
      },
    );

    const payload = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Gemini ${model} failed (${response.status}).`);
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

export async function generateJson<T>(prompt: string): Promise<T> {
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      return (await generateOnce(model, prompt)) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed.");
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
