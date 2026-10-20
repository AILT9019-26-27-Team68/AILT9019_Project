import { Router } from "express";
import { getSchema } from "../services/pythonBridge.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    // getSchema() is memoised in pythonBridge, so this is one call per process.
    res.json(await getSchema());
  } catch (err) {
    next(err);
  }
});

export default router;
