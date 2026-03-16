import ALLOWED_MODELS from "../constants/allowedModels.js";

export default function safeModel({input, allowedModels = ALLOWED_MODELS}) {
  if (!input) return "gemini-2.5-flash";
  if (allowedModels.has(input)) return input;
  return "gemini-2.5-flash";
}