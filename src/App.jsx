import { useState } from 'react'

// --- UI COMPONENT: LoadingSpinner ---
// A simple visual indicator to show the user that a process is running.
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600"></div>
  </div>
)

// --- UI COMPONENT: ImagePlaceholder ---
// A placeholder with a pulsing animation shown while the AI image is being generated.
// This improves user experience by managing expectations.
const ImagePlaceholder = () => (
  <div className="bg-stone-200 rounded-lg h-48 sm:h-56 md:h-64 flex items-center justify-center animate-pulse">
    <p className="text-stone-500">Generating culinary art...</p>
  </div>
)

// --- UI COMPONENT: SearchBar ---
// The main form for user input. It is a controlled component, with its value tied to state.
const SearchBar = ({ location, setLocation, handleGetGuide, loading }) => (
  <form onSubmit={handleGetGuide} className="flex gap-3 shadow-md rounded-lg p-2 bg-white">
    <input
      type="text"
      value={location}
      onChange={(e) => setLocation(e.target.value)}
      placeholder="e.g., 'Thailand', 'Rome', 'Kyoto'"
      className="flex-grow p-3 rounded-md border-transparent focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-300 text-lg"
    />
    <button
      type="submit"
      disabled={loading}
      className="bg-amber-600 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:bg-amber-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
    >
      {loading ? 'Exploring...' : 'Find Food'}
    </button>
  </form>
)

// --- UI COMPONENT: GuideCard ---
// The main component for displaying the fetched culinary guide.
// It conditionally renders the image, placeholder, and all text content.
// Responsive classes (sm:, md:) ensure it adapts to different screen sizes.
const GuideCard = ({ guide, imageUrl, isImageLoading }) => (
  <div className="bg-white rounded-xl shadow-2xl mt-8 animate-fade-in border border-gray-200 overflow-hidden">
    {/* Conditionally render the image or its placeholder based on the loading state */}
    {isImageLoading && <ImagePlaceholder />}
    {imageUrl && <img src={imageUrl} alt={guide.mustTryDishes[0]?.name || guide.locationName} className="w-full h-48 sm:h-56 md:h-64 object-cover" />}

    <div className="p-6 md:p-8 space-y-6">
      <h2 className="text-3xl md:text-4xl font-bold text-amber-800 text-center border-b pb-4">
        {guide.locationName}
      </h2>

      <div className="space-y-4">
        <h3 className="text-xl md:text-2xl font-semibold text-stone-700">Must-Try Dishes 🍲</h3>
        <ul className="list-disc list-inside space-y-3 pl-2">
          {guide.mustTryDishes.map((dish) => (
            <li key={dish.name} className="text-stone-600">
              <strong className="text-stone-800">{dish.name}:</strong> {dish.description}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <h3 className="text-xl md:text-2xl font-semibold text-stone-700">Etiquette Tip 💡</h3>
        <p className="text-stone-600">{guide.etiquetteTip}</p>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <h3 className="text-xl md:text-2xl font-semibold text-stone-700">Where to Eat 🍴</h3>
        <p className="text-stone-600">{guide.restaurantSuggestion}</p>
      </div>
    </div>
  </div>
)

// --- MAIN APP COMPONENT ---
// This is the core of the application, managing state and orchestrating API calls.

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

const App = () => {
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
  const [isImageLoading, setIsImageLoading] = useState(false)

  // --- API FUNCTION 2: Generate Image ---
  // This function is called *after* the text guide is received.
  // It takes the image prompt from the first API call and makes a second call to Imagen 3.
  const handleGenerateImage = async (imageGenPrompt) => {
    setIsImageLoading(true)
    setImageUrl(null)

    const payload = {
      instances: [{ prompt: imageGenPrompt }],
      parameters: { sampleCount: 1 },
    }

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Image generation failed with status ${response.status}`)

      const result = await response.json()
      if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
        // The image is returned as a base64 string, which we format into a data URL
        const newImageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`
        setImageUrl(newImageUrl)
      } else {
        throw new Error('Invalid image response structure.')
      }
    } catch (err) {
      console.error('Image generation error:', err)
      // If image generation fails, we don't show a blocking error to the user.
      // The text guide is still valuable on its own.
    } finally {
      setIsImageLoading(false)
    }
  }

  // --- API FUNCTION 1: Get Culinary Guide ---
  // This is the primary function triggered by the user's search.
  // It calls the Gemini API to get the structured text guide.
  const handleGetGuide = async (e) => {
    e.preventDefault()
    if (!location) {
      setError('Please enter a country or city.')
      return
    }

    // Reset state for a new search
    setLoading(true)
    setError(null)
    setGuide(null)
    setImageUrl(null)

    // The prompt is carefully worded to ask for all the pieces of information we need.
    const prompt = `Provide a mini culinary guide for ${location}. I need a list of 3-5 must-try dishes, one etiquette tip, a restaurant suggestion, and a photorealistic image generation prompt for the most iconic dish. Respond in valid JSON.`

    // The schema enforces a strict JSON output, making the AI's response reliable and predictable.
    const schema = {
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

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    }

    try {
      if (!apiKey) throw new Error('API Key is missing.')
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`)

      const result = await response.json()
      const jsonResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!jsonResponseText) throw new Error('Invalid response structure from AI.')

      const parsedGuide = JSON.parse(jsonResponseText)
      setGuide(parsedGuide)

      // --- Chaining API Calls ---
      // If the guide is fetched successfully, we immediately trigger the image generation function.
      if (parsedGuide.imageGenPrompt) {
        handleGenerateImage(parsedGuide.imageGenPrompt)
      }
    } catch (err) {
      console.error(err)
      setError('Could not fetch the guide. The Culinary Compass is recalibrating!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 font-serif p-4 sm:p-6 md:p-8">
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

          {loading && <LoadingSpinner />}

          {/* The GuideCard is only rendered when the 'guide' state has data */}
          {guide && <GuideCard guide={guide} imageUrl={imageUrl} isImageLoading={isImageLoading} />}
        </main>
      </div>
    </div>
  )
}

export default App