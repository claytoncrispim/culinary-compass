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

    export default GUIDE_SCHEMA;