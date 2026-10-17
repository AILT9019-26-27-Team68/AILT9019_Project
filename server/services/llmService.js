import axios from "axios";

function langInstruction(language) {
  // TODO: Return the proper string instruction based on language:
  // "zh-Hant" -> "\nRespond in Traditional Chinese using Hong Kong conventions (繁體中文，香港用語). Keep formatting clean."
  // "zh-Hans" -> "\nRespond in Simplified Chinese (简体中文). Keep formatting clean."
  // default -> "\nRespond in English."
  return "";
}

async function callNvidia(prompt) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set");
  const base = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_MODEL;
  if (!model) throw new Error("NVIDIA_MODEL not set");

  // TODO: Use axios to POST to `${base}/chat/completions`.
  // Include headers: { Authorization: `Bearer ${key}` } and a 90000ms timeout.
  // Include body: { model, messages: [system, user], temperature: 0.4, max_tokens: 3000 }.
  // System prompt: "You are a supportive, non-clinical academic coach. Answer in 2-4 short paragraphs. Do not reveal your reasoning."
  // User prompt: `prompt`
  
  // TODO: Extract `msg.content` from the response.
  // If empty, extract `msg.reasoning_content`.
  // If both empty, throw new Error("NVIDIA returned empty content").
  
  return "";
}

export async function getAdvice({ prompt, language = "en" }) {
  // TODO: Combine prompt + langInstruction(language) and pass to callNvidia().
  return "";
}
