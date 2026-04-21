/**
 * Tahap: LLM Connection Utility
 * Peran: Menyediakan koneksi ke OpenRouter.
 * Input: Prompt/messages dari sistem.
 * Output: Respons model dalam bentuk teks.
 *
 * Penjelasan:
 * File ini menjadi penghubung antara aplikasi dan model bahasa.
 * Tahap ini dipakai terutama untuk membantu sistem
 * memahami intent pertanyaan user.
 *
 * Dengan memisahkan koneksi LLM ke file ini,
 * logic GraphRAG tetap rapi dan tidak bercampur
 * dengan detail teknis request API model.
 */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    code?: string | number;
    message?: string;
  };
};

export async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  if (!model) {
    throw new Error("OPENROUTER_MODEL is missing.");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-OpenRouter-Title": process.env.NEXT_PUBLIC_APP_NAME ?? "NusaKata",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
    }),
  });

  const data = (await response.json()) as OpenRouterChatResponse;

  if (!response.ok) {
    const message = data?.error?.message ?? "OpenRouter request failed.";
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned empty content.");
  }

  return content;
}