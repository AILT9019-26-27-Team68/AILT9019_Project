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
      max_tokens: 800, 
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: 45000 }
  );

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (text) return text;

  throw new Error("Bailian returned empty content");
}

export async function getAdvice({ prompt, language = "en" }) {
  const full = prompt + langInstruction(language);
  return callBailian(full);
}
