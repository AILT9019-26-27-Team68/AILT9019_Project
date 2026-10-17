import { Router } from "express";
import { getSchema } from "../services/pythonBridge.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    // TODO: Fetch the schema using getSchema() and send it as a JSON response.
    res.json({}); 
  } catch (err) {
    next(err);
  }
});

export default router;
