import dotenv from "dotenv";
dotenv.config();
import stripCodeFences from "./utils/stripCodeFences.js";
import safeModel from "./utils/safeModel.js";
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Response schema (Gemini's response will be validated against this schema to ensure it contains the expected fields and types.)

const GUIDE_SCHEMA = {
      type: 'OBJECT',
      properties: {
        locationName: { type: 'STRING' },
        mustTryDishes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' }, description: { type: 'STRING' } },
            required: ['name', 'description'],
          },
        },
        etiquetteTip: { type: 'STRING' },
        restaurantSuggestion: { type: 'STRING' },
        imageGenPrompt: { type: 'STRING', description: 'A detailed, photorealistic prompt for an image generation model.' },
      },
      required: ['locationName', 'mustTryDishes', 'etiquetteTip', 'restaurantSuggestion', 'imageGenPrompt'],
    }


safeModel({}) // Example usage of safeModel function to validate model input;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Sanity check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /api/get-guide
 * Body: { prompt: string, model?: string }
 * Returns: JSON object matching the GUIDE_SCHEMA
 * 
 * This endpoint receives a prompt from the frontend, calls the Gemini API with the specified model and schema, and returns the structured culinary guide. It includes error handling for missing API key, invalid model selection, and API request failures.
 * The response from Gemini is validated against the GUIDE_SCHEMA to ensure it contains all the expected fields and types before being sent back to the frontend.
 */
app.post("/api/get-guide", async (req, res) => {
    try {
        if (!GOOGLE_API_KEY) {
            return res
            .status(500)
            .json({ error: "Missing GOOGLE_API_KEY on the server." });
        }
        
        const { prompt, model } =  req.body || {};
        if (typeof prompt !== "string" || prompt.trim().length === 0) {
            return res.status(400).json({ error: "Prompt is required." });
        }

        const selectedModel = safeModel({ input: model });

        const payload = {
            contents: [
                {
                role: "user",
                parts: [{ text: prompt}],
                },
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: GUIDE_SCHEMA,
            },
        };
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GOOGLE_API_KEY}`;
        const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        // Try to parse JSON response from Gemini API
        const data = await apiResponse.json().catch(() => null);
        
        if (!apiResponse.ok) {
            const message = 
                data?.error?.message ||
                data?.error ||
                `Gemini API error (${apiResponse.status})`;
            return res.status(apiResponse.status).json({ error: message, details: data });
        }

        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            return res
            .status(500)
            .json({ error: "No text generated from Gemini API." });
        }

        // Strip code fences if present
        const cleanedResponse = stripCodeFences(responseText);

        let parsed;
        try {
            parsed = JSON.parse(cleanedResponse);
        } catch (err) {
            return res.status(500).json({
                error: "Gemini returned invalid JSON.",
                raw: cleanedResponse,
            });
        }

        return res.json(parsed);
        } catch (err) {
            console.error("Backend error:", err);
            return res.status(500).json({ error: "Server error", details: String(err) });
        }
});      

// Temporary health check endpoint - verifies if routing is working correctly
app.get("/_whoami", (req, res) => {
    res.json({ ok: true, file: "backend/server.js" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log("✅ Running backend/server.js from:", process.cwd());
});