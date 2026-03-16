export default function buildImagePrompt({
    location,
}) {
      
    // Prompt based on the location
    return `A detailed, photorealistic dish of the ${location} cuisine for ${location} image generation model.`.trim();
}