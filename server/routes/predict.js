import { Router } from "express";
import { predictRisk } from "../services/pythonBridge.js";
import { getAdvice } from "../services/llmService.js";
import { pickArchetype } from "../services/pageContract.js";
import { validateInput } from "../middleware/validateInput.js";

const router = Router();

router.post("/", validateInput, async (req, res, next) => {
  try {
    // 1. Python: RF + z-bands + categorical signals + crisis rule + prompt
    const inference = await predictRisk(req.cleanInput);

    // 2. Pattern name — picked once, so the prompt and the deck agree
    const archetype = pickArchetype(inference, req.language);

    // 3. LLM with safe fallback
    let advice = "";
    let llmError = null;
    try {
      advice = await getAdvice({
        prompt: inference.prompt,
        language: req.language,
        crisis: inference.crisis,
        archetype,
      });
      if (!advice) throw new Error("empty LLM response");
    } catch (err) {
      llmError = err.message;
      advice = inference.fallback;
    }

    res.json({
      risk_score: inference.risk_score,
      risk_tier: inference.risk_tier,
      decision: inference.decision,
      threshold: inference.threshold,
      z_bands: inference.z_bands,
      categorical_signals: inference.categorical_signals,
      key_factors: inference.key_factors,
      crisis: inference.crisis,
      prompt_type: inference.prompt_type,
      archetype,
      language: req.language,
      advice,
      used_fallback: Boolean(llmError),
      llm_error: llmError,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
