import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";

import { apiError, asyncHandler } from "./utils/http.js";
import GUIDE_SCHEMA from "./constants/guideSchema.js";
import stripCodeFences from "./utils/stripCodeFences.js";
import safeModel from "./utils/safeModel.js";


const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

safeModel({}) // Example usage of safeModel function to validate model input;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Sanity check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PROJECT_ID = "culinary-compass-app-473814";

/**
 * POST /api/generate-image
 * Body: { prompt: string }
 * Returns: { imageUrl: string }
 * 
 * This endpoint receives an image generation prompt from the frontend, calls the Imagen 3 API, and returns a URL to the generated image. It includes error handling for missing API key, invalid prompt, and API request failures. The response from Imagen is expected to contain a base64-encoded image, which is converted to a data URL before being sent back to the frontend.
 */
app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;

    try {
        // Decide where to get service account credentials based on environment
        let authOptions;

        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            // Production credential from environment variable at Render.com
            // TODO: Create service and copy backend/service-account.json content into GOOGLE_SERVICE_ACCOUNT_JSON env var on Render.com

            let serviceAccount;
            try {
                serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            } catch (parseErr) {
                console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", parseErr);
                throw new Error("SERVICE_ACCOUNT_JSON_PARSE_ERROR");
            }

            authOptions = {
                credentials: serviceAccount,
                projectId: serviceAccount.project_id || PROJECT_ID,
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
            };

            console.log("Using service account credentials from environment variable.");

        } else {
            // Local development credential from file
            authOptions = {
                keyFile: "./service-account.json",
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
            };

            console.log("Using local service-account.json key file.");           
        }

        const auth = new GoogleAuth(authOptions);
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(
            `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`,
            {
                method: "POST",
                headers: {
                Authorization: `Bearer ${accessToken.token}`,
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1 },
                }),
            }
        ); 
        
        const result = await response.json();
        res.json(result);
    } catch (err) {
        console.error("Imagen backend error:", err);
        res.status(500).json({ error: err.toString() });
    }
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