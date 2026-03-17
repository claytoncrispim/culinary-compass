// --- IMPORTS ---
import { useState } from 'react'
// Importing components
import LoadingSpinner from '../components/LoadingSpinner'
import SearchBar from '../components/SearchBar'
import GuideCard from '../components/GuideCard'
// Importing utils
import { fetchWithRetry } from '../utils/fetchWithRetry'
import { ApiError } from '../utils/ApiError'
import buildImagePrompt from '../utils/buildImagePrompt'
import getUserMessage from '../utils/getUserMessage'


// --- CONFIGURATION ---
// Base URL for the backend API
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// --- HELPERS ---
// --- GEMINI API CALL FUNCTION ---
// Helper function for Gemini initialization
// It calls Gemini via our backend, which handles the API key and request formatting. We use fetchWithRetry to add robustness to our API calls, especially for the image generation which can be more prone to rate limits and timeouts.
const callGemini = async (prompt) => {
  try {
    const res = await fetchWithRetry(
      `${API_BASE_URL}/api/get-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!data || typeof data !== "object") {
      throw new Error("UNEXPECTED_RESPONSE_SHAPE");
    }

    return data;
  } catch (err) {
    // Keep rich errors from backend (VALIDATION_ERROR, UPSTREAM_*, etc.)
    if (err instanceof ApiError) throw err;

    // Network failure / JSOn parse failure / unexpected response shape
    throw err;
  }
};

// --- PROMPT BUILDER FUNCTION ---
// Helper function to build the Gemini prompt
const buildPrompt = ({
  location,
}) => {

  return `
      Provide a mini culinary guide for ${location}. I need a list of 3-5 must-try dishes, one etiquette tip, a restaurant suggestion, and a photorealistic image generation prompt for the most iconic dish. Respond in valid JSON.
      
    `;
};


// --- MAIN APP COMPONENT ---
const App = () => {

  // **** STATE VARIABLES ****
  // State for the user's search query
  const [location, setLocation] = useState('')
  // State to hold the structured culinary guide from the Gemini API
  const [guide, setGuide] = useState(null)
  // State to manage the loading status of the primary guide data
  const [loading, setLoading] = useState(false)
  // State to hold any potential error messages
  const [error, setError] = useState(null)

  // State to manage the lifecycle of the AI-generated image
  const [imageUrl, setImageUrl] = useState(null)
  // const [isImageLoading, setIsImageLoading] = useState(false) // REFACTORED:
  // We now have a more granular loading state for different parts of the UI, including image generation, so we replaced isImageLoading with loadingParts.image. This allows us to show loading indicators for specific sections (e.g., "Generating image...") without blocking the entire UI with a generic loading state.

  // --- Components Loading state ---
  const [loadingParts, setLoadingParts] = useState({
    guide: false,
    image: false,
  });

  // --- Image Notice State ---
  const [imageNotice, setImageNotice] = useState(null);

  // --- HANDLER FUNCTION: Image Generation ---
  // This function handles the image generation process. It is called after we successfully receive the guide data, using the image generation prompt provided by Gemini.
  const handleGenerateImage = async (prompt) => {
    setPartLoading("image", true);
    setImageUrl(null);
    setImageNotice(null);

    // const payload = {
    //   instances: [{ prompt: imageGenPrompt }],
    //   parameters: { sampleCount: 1 },
    // }

    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/api/generate-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
      const data = await response.json();

      const base64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64) {
        // Not fatal: image is optional and we can still show the guide data. But log it so we can investigate. 
        console.warn("Image generation returned no image (possibly blocked). Payload:", data);
        setImageNotice("Image isn’t available right now. Showing the guide without it.");
        return null;
      }

      const imgUrl = `data:image/png;base64,${base64}`;
      setImageUrl(imgUrl);
      return imgUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn(
          'Image generation failed:',
          err.status,
          err.code,
          err.message,
          err.details
        );

        //  If rate-limited or upstream issue, show a user-friendly hint:
        if (err.status === 429) {
          setImageNotice("Image generation is rate-limited right now. Try again in a minute.");
        } else {
          setImageNotice("Image isn’t available right now. Showing the guide without it.");
        }
      } else {
        console.warn('Image generation failed:', err);
        setImageNotice("Image isn’t available right now. Showing the guide without it.");
      }
      return null;
    } finally {
      setPartLoading("image", false);
    }
  };


  // --- HANDLER FUNCTION: Get Culinary Guide ---
  // This is the primary function triggered by the user's search.
  // It calls the Gemini API to get the structured text guide.
  const handleGetGuide = async (e) => {
    e.preventDefault();

    // Basic input validation
    if (!location) {
      setError('Please enter a country or city.');
      return;
    }

    // Reset state for a new search
    setLoading(true);
    setError(null);
    setGuide(null);
    setImageUrl(null);
    setImageNotice(null);

    try {
      // Clean and build the prompt
      const cleanedLocation = location.trim();
      const prompt = buildPrompt({ location: cleanedLocation });

      setPartLoading("guide", true);
      // Call the Gemini API to get the guide data
      const guideData = await callGemini(prompt);
      console.log("Received guide data from Gemini:", guideData);
      setGuide(guideData);
      setPartLoading("guide", false);

      // --- IMAGE GENERATION CHAINING ---
      const imageGenPrompt = buildImagePrompt({ location: cleanedLocation });

      await handleGenerateImage(imageGenPrompt);

    } catch (err) {
      console.error("Frontend error in handleGetGuide:", err);
      setError(getUserMessage(err));
    } finally {
      setPartLoading("guide", false);
      setLoading(false);
    }
  };



  // // The prompt is carefully worded to ask for all the pieces of information we need.
  // const prompt = `Provide a mini culinary guide for ${location}. I need a list of 3-5 must-try dishes, one etiquette tip, a restaurant suggestion, and a photorealistic image generation prompt for the most iconic dish. Respond in valid JSON.`

  // // The schema enforces a strict JSON output, making the AI's response reliable and predictable.
  // const schema = {
  //   type: 'OBJECT',
  //   properties: {
  //     locationName: { type: 'STRING' },
  //     mustTryDishes: {
  //       type: 'ARRAY',
  //       items: {
  //         type: 'OBJECT',
  //         properties: { name: { type: 'STRING' }, description: { type: 'STRING' } },
  //         required: ['name', 'description'],
  //       },
  //     },
  //     etiquetteTip: { type: 'STRING' },
  //     restaurantSuggestion: { type: 'STRING' },
  //     imageGenPrompt: { type: 'STRING', description: 'A detailed, photorealistic prompt for an image generation model.' },
  //   },
  //   required: ['locationName', 'mustTryDishes', 'etiquetteTip', 'restaurantSuggestion', 'imageGenPrompt'],
  // }

  // const payload = {
  //   contents: [{ parts: [{ text: prompt }] }],
  //   generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
  // }

  // try {
  //   if (!apiKey) throw new Error('API Key is missing.')
  //   const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  //   const response = await fetch(apiUrl, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(payload),
  //   })
  //   if (!response.ok) throw new Error(`API request failed with status ${response.status}`)

  //   const result = await response.json()
  //   const jsonResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text
  //   if (!jsonResponseText) throw new Error('Invalid response structure from AI.')

  //   const parsedGuide = JSON.parse(jsonResponseText)
  //   setGuide(parsedGuide)

  //   // --- Chaining API Calls ---
  //   // If the guide is fetched successfully, we immediately trigger the image generation function.
  //   if (parsedGuide.imageGenPrompt) {
  //     handleGenerateImage(parsedGuide.imageGenPrompt)
  //   }
  // } catch (err) {
  //   console.error(err)
  //   setError('Could not fetch the guide. The Culinary Compass is recalibrating!')
  // } finally {
  //   setLoading(false)
  // }




  // PARTS LOADING STATE HELPER: Helper function to set loading state for different parts of the UI
  const setPartLoading = (part, value) => {
    setLoadingParts((prev) => ({ ...prev, [part]: value }));
  };

  // LOADING LABEL HELPER: Helper function to get loading label based on which part is loading
  const getLoadingLabel =
    loadingParts.guide ? "Generating your culinary guide..." :
      loadingParts.image ? "Generating the image of the iconic dish..." :
        "Loading...";


  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="container mx-auto max-w-2xl">
        <header className="text-center my-6 md:my-8">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-800">
            Culinary Compass 🧭
          </h1>
          <p className="text-stone-600 mt-2 text-lg">Your AI guide to the world's flavors.</p>
        </header>

        <main>
          <SearchBar location={location} setLocation={setLocation} handleGetGuide={handleGetGuide} loading={loading} />

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6 text-center">
              {error}
            </div>
          )}

          {loading && (
            <>
            {/* Loading state for different parts of the UI
              "guide" -> Generating your culinary guide...
              "image" -> Generating the image of the iconic dish...
            */}
              <LoadingSpinner />
              <p className="text-center text-stone-600 mt-2">{getLoadingLabel}</p>
            </>
          )}

          {imageNotice && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg relative mt-6 text-center">
              {imageNotice}
            </div>
          )}

          {/* The GuideCard is only rendered when the 'guide' state has data */}
          {guide && <GuideCard guide={guide} imageUrl={imageUrl} isImageLoading={loadingParts.image} />}
        </main>

        {/* Footer and Credits */}
        <footer className="mt-10 text-center text-[11px] text-stone-700">
            <p>
                Built by <a href="https://www.claytoncrispim.com" target="_blank" rel="noopener noreferrer" className="underline">Clayton Crispim </a> · Powered by Gemini & Imagen
            </p>
        </footer>
      </div>
    </div>
  )
}

export default App