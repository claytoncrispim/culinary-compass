// --- UI COMPONENT: SearchBar ---
// The main form for user input. It is a controlled component, with its value tied to state.
const SearchBar = ({ location, setLocation, handleGetGuide, loading }) => (
  <form onSubmit={handleGetGuide} className="flex gap-2 shadow-md rounded-lg p-2 bg-white w-full">
    <input
      type="text"
      value={location}
      onChange={(e) => setLocation(e.target.value)}
      placeholder="e.g., 'Thailand', 'Rome', 'Kyoto'"
      className="flex-grow min-w-0 p-3 rounded-md border border-transparent focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition duration-300 text-base"
    />
    <button
      type="submit"
      disabled={loading}
      className="bg-amber-600 text-white font-bold py-3 px-4 sm:px-6 rounded-md shadow-lg hover:bg-amber-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 text-sm sm:text-base whitespace-nowrap"
    >
      {loading ? 'Exploring...' : 'Find Food'}
    </button>
  </form>
)

export default SearchBar