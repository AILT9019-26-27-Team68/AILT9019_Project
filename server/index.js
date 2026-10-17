import "./env.js"; // MUST be first — loads .env before other imports evaluate.

import express from "express";
import cors from "cors";
import morgan from "morgan";

import schemaRoute from "./routes/schema.js";
import predictRoute from "./routes/predict.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

// TODO: Mount the schema route on "/api/schema"
// TODO: Mount the predict route on "/api/predict"

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] listening on http://127.0.0.1:${PORT}`);
});
