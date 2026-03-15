import ALLOWED_MODELS from "../constants/ALLOWED_MODELS.js";

export default function safeModel({input, allowedModels = ALLOWED_MODELS}) {
  if (!input) return "gemini-2.5-flash";
  if (allowedModels.has(input)) return input;
  return "gemini-2.5-flash";
}