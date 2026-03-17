// --- UI COMPONENT: LoadingSpinner ---
// A simple visual indicator to show the user that a process is running.
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600"></div>
  </div>
)

export default LoadingSpinner