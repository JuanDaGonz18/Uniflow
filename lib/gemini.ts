export type GeminiPart = { text?: string };
export type GeminiContent = { parts: GeminiPart[] };
export type GeminiCandidate = { content: GeminiContent };
export type GeminiResponse = { candidates: GeminiCandidate[] };

export async function askGemini(prompt: string) {
  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data: GeminiResponse = await response.json();

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error("Respuesta vacía del modelo");

  return raw;
}
