export default function safeModel(input, allowedModels) {
  if (!input) return "gemini-2.5-flash";
  if (allowedModels.has(input)) return input;
  return "gemini-2.5-flash";
}