/**
 * Loads .env from the project root before any other module runs.
 * `index.js` imports this first so that services which read
 * `process.env.*` at module scope see the correct values.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
