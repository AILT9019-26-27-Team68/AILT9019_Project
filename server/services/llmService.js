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
 * Alibaba Cloud Bailian (OpenAI-compatible API)
 */
async function callBailian(prompt) {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error("BAILIAN_API_KEY not set");
  
  const base = process.env.BAILIAN_BASE_URL || "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";
  const model = process.env.BAILIAN_MODEL || "deepseek-v4.1-flash";

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
      // deepseek-v4.1-flash is a REASONING model: invisible reasoning tokens
      // count against max_tokens (measured ~500-1700 per request). 800 left
      // nothing for the answer -> empty content / finish_reason "length".
      max_tokens: 4096,
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: 60000 }
  );

  const choice = data?.choices?.[0];
  const text = choice?.message?.content?.trim();
  if (text) return text;

  // diagnostic detail so the fallback note says WHY it was empty
  const detail = choice
    ? `finish_reason=${choice.finish_reason || "unknown"}, ` +
      `reasoning_tokens=${data?.usage?.completion_tokens_details?.reasoning_tokens ?? "?"}`
    : `no choices in response: ${JSON.stringify(data).slice(0, 300)}`;
  throw new Error(`Bailian returned empty content (${detail})`);
}

export async function getAdvice({ prompt, language = "en" }) {
  const full = prompt + langInstruction(language);
  return callBailian(full);
}
