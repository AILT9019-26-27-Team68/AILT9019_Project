import axios from "axios";

function langInstruction(language) {
  if (language === "zh-Hant") {
    return (
      "\nRespond in Traditional Chinese using Hong Kong conventions " +
      "(繁體中文，香港用語). Keep formatting clean."
    );
  }
  if (language === "zh-Hans") {
    return "\nRespond in Simplified Chinese (简体中文). Keep formatting clean.";
  }
  return "\nRespond in English.";
}

/**
 * NVIDIA NIM API — supports both plain chat models and reasoning models
 * (e.g. deepseek-ai/deepseek-v4.1-flash).
 *
 * Reasoning models emit two fields:
 *   - message.reasoning_content : internal chain-of-thought (not shown to user)
 *   - message.content           : the visible answer
 *
 * If max_tokens is too low, reasoning consumes the entire budget and content
 * is null. We give it 3000 tokens so it has room to think and still answer.
 */
async function callNvidia(prompt) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set");
  const base = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_MODEL;
  if (!model) throw new Error("NVIDIA_MODEL not set");

  const { data } = await axios.post(
    `${base}/chat/completions`,
    {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a supportive, non-clinical academic coach. " +
            "Answer in 2-4 short paragraphs. Do not reveal your reasoning.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: 90000 }
  );

  const msg = data?.choices?.[0]?.message || {};
  const text = (msg.content || "").trim();
  if (text) return text;

  // Fallback: if reasoning ate the entire token budget and content is null,
  // return the reasoning text so the user still sees something useful.
  const reasoning = (msg.reasoning_content || "").trim();
  if (reasoning) return reasoning;

  throw new Error("NVIDIA returned empty content");
}

export async function getAdvice({ prompt, language = "en" }) {
  const full = prompt + langInstruction(language);
  return callNvidia(full);
}
