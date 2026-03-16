import ImagePlaceholder from "./ImagePlaceholder"

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

export default GuideCard