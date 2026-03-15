import dotenv from "dotenv";
dotenv.config();
import stripCodeFences from "./utils/stripCodeFences.js";
import safeModels from "./utils/safeModels.js";

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const ALLOWED_MODELS = new Set ([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",    
])

safeModels(ALLOWED_MODELS);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));