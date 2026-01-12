// Gemini AI integration using REST API for better compatibility

export interface GeneratedSpot {
    name: string;
    description: string;
    category: 'popular' | 'museum' | 'nature' | 'foodie' | 'history' | 'shopping';
    lat: number;
    lng: number;
    imageUrl: string;
    rating?: number;
    country?: string; // Added for database persistence
}

export interface TripPreferences {
    destination: string;
    country: string;
    categories: string[];
    days: number;
}

export interface DayPlan {
    day: number;
    theme?: string;
    spots: GeneratedSpot[];
}

// Spot extracted from TikTok/Instagram content
export interface ExtractedSpot {
    name: string;
    category: 'cafe' | 'restaurant' | 'attraction' | 'hotel' | 'bar' | 'other';
    description: string;
    confidence: number; // 0-1 how confident the AI is about this spot
    estimatedLocation?: {
        city?: string;
        country?: string;
        lat?: number;
        lng?: number;
    };
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        console.error('Gemini API key not configured');
        throw new Error('Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    console.log('Calling Gemini AI...');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API Error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini');
    }

    console.log('Gemini AI response received successfully');
    return data.candidates[0].content.parts[0].text;
}

/**
 * Generate a complete day-by-day trip plan using AI
 * This creates everything in one call - spots organized by day with themes
 */
export async function generateFullTrip(preferences: TripPreferences): Promise<DayPlan[]> {
    const prompt = `You are an expert travel planner. Create a detailed ${preferences.days}-day trip itinerary for ${preferences.destination}, ${preferences.country}.

The traveler is interested in: ${preferences.categories.join(', ')}.

Create a day-by-day plan where each day has:
- A theme (e.g., "Historic Old Town", "Food & Markets Day", "Nature Exploration")
- 3-4 spots that are geographically close to each other for efficient travel
- Spots should flow logically (e.g., breakfast spot → morning attraction → lunch → afternoon activities)

For each spot provide:
- name: Exact place name
- description: 1-2 sentences about what makes it special
- category: One of: popular, museum, nature, foodie, history, shopping
- lat: Accurate latitude coordinate
- lng: Accurate longitude coordinate
- rating: Rating between 4.0-5.0

Return ONLY valid JSON in this exact format:
[
  {
    "day": 1,
    "theme": "Day theme here",
    "spots": [
      {"name": "Place Name", "description": "Description", "category": "popular", "lat": 35.67, "lng": 139.65, "rating": 4.7}
    ]
  }
]

Important:
- Use ACCURATE real coordinates for each location
- Group nearby spots on the same day
- Consider realistic timing (not too many spots per day)
- Return ONLY the JSON array, no markdown or extra text`;

    try {
        const text = await callGemini(prompt);

        // Clean response
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        const itinerary: DayPlan[] = JSON.parse(cleanText);

        // Add image URLs and country to each spot
        return itinerary.map(day => ({
            ...day,
            spots: day.spots.map((spot, index) => ({
                ...spot,
                country: preferences.country || preferences.destination,
                imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spot.name + day.day + index)}/400/300`,
            }))
        }));
    } catch (error) {
        console.error('AI Trip Planning Error:', error);
        throw error; // Don't silently fall back - let the UI handle the error
    }
}

/**
 * Generate spots for a destination (discovery mode)
 */
export async function generateSpots(preferences: TripPreferences): Promise<GeneratedSpot[]> {
    const prompt = `You are a travel expert. Generate ${Math.min(preferences.days * 4, 15)} unique travel spots for a trip to ${preferences.destination}, ${preferences.country}.

The traveler is interested in: ${preferences.categories.join(', ')}.
Trip duration: ${preferences.days} days.

For each spot provide JSON with:
- name: Exact place name
- description: 1-2 sentence description
- category: One of: popular, museum, nature, foodie, history, shopping
- lat: Accurate latitude coordinate
- lng: Accurate longitude coordinate  
- rating: Rating 4.0-5.0

Return ONLY a valid JSON array, no markdown. Example:
[{"name":"Example","description":"A landmark","category":"popular","lat":35.67,"lng":139.65,"rating":4.7}]`;

    try {
        const text = await callGemini(prompt);

        // Clean response
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        const spots: GeneratedSpot[] = JSON.parse(cleanText);

        return spots.map((spot, index) => ({
            ...spot,
            country: preferences.country || preferences.destination,
            imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spot.name + index)}/400/300`,
        }));
    } catch (error) {
        console.error('Gemini spot generation error:', error);
        throw error; // Don't silently fall back
    }
}

/**
 * Use AI to optimize an existing set of spots into a smart itinerary
 */
export async function generateItinerary(
    destination: string,
    spots: GeneratedSpot[],
    days: number
): Promise<DayPlan[]> {
    if (spots.length === 0) {
        return Array.from({ length: days }, (_, i) => ({ day: i + 1, spots: [] }));
    }

    const spotsList = spots.map(s => `- ${s.name} (${s.category}) at [${s.lat}, ${s.lng}]`).join('\n');

    const prompt = `You are an expert travel planner. Organize these spots into an optimal ${days}-day itinerary for ${destination}.

Available spots:
${spotsList}

Rules:
1. Group spots that are geographically close on the same day
2. Create a logical flow (e.g., morning activities → lunch → afternoon → evening)
3. Don't overload any single day (max 4-5 spots)
4. Each day should have a theme if possible

Return ONLY valid JSON in this format:
[
  {
    "day": 1,
    "theme": "Theme for day 1",
    "spotNames": ["Spot Name 1", "Spot Name 2"]
  }
]

Return ONLY the JSON array, no extra text.`;

    try {
        const text = await callGemini(prompt);

        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

        const aiPlan: { day: number; theme?: string; spotNames: string[] }[] = JSON.parse(cleanText.trim());

        // Map spot names back to full spot objects
        const spotMap = new Map(spots.map(s => [s.name.toLowerCase().trim(), s]));

        return aiPlan.map(day => ({
            day: day.day,
            theme: day.theme,
            spots: day.spotNames
                .map(name => spotMap.get(name.toLowerCase().trim()))
                .filter((s): s is GeneratedSpot => s !== undefined)
        }));
    } catch (error) {
        console.error('AI Itinerary Error, falling back to simple distribution:', error);
        // Fallback to simple distribution only if AI fails
        const spotsPerDay = Math.ceil(spots.length / days);
        return Array.from({ length: days }, (_, d) => ({
            day: d + 1,
            spots: spots.slice(d * spotsPerDay, (d + 1) * spotsPerDay),
        }));
    }
}

function getMockSpots(preferences: TripPreferences): GeneratedSpot[] {
    // Fallback mock data when API fails
    const mockSpots: Record<string, GeneratedSpot[]> = {
        'Japan': [
            { name: 'Senso-ji Temple', description: 'Ancient Buddhist temple in Asakusa', category: 'history', lat: 35.7147, lng: 139.7966, imageUrl: '', rating: 4.8 },
            { name: 'Tokyo Skytree', description: 'Iconic 634m broadcasting tower with observation decks', category: 'popular', lat: 35.7100, lng: 139.8107, imageUrl: '', rating: 4.6 },
            { name: 'Tsukiji Outer Market', description: 'Famous market for fresh sushi and street food', category: 'foodie', lat: 35.6654, lng: 139.7707, imageUrl: '', rating: 4.7 },
            { name: 'Meiji Shrine', description: 'Serene Shinto shrine surrounded by forest', category: 'nature', lat: 35.6764, lng: 139.6993, imageUrl: '', rating: 4.8 },
            { name: 'teamLab Borderless', description: 'Immersive digital art museum', category: 'museum', lat: 35.6262, lng: 139.7839, imageUrl: '', rating: 4.9 },
            { name: 'Shibuya Crossing', description: 'World famous pedestrian scramble intersection', category: 'popular', lat: 35.6595, lng: 139.7004, imageUrl: '', rating: 4.5 },
        ],
        'default': [
            { name: 'City Center', description: 'Main downtown area with shops and restaurants', category: 'popular', lat: 0, lng: 0, imageUrl: '', rating: 4.5 },
            { name: 'Local Market', description: 'Traditional market with local cuisine', category: 'foodie', lat: 0, lng: 0, imageUrl: '', rating: 4.6 },
            { name: 'Historic District', description: 'Old town with historic buildings', category: 'history', lat: 0, lng: 0, imageUrl: '', rating: 4.4 },
            { name: 'City Park', description: 'Large green space perfect for walks', category: 'nature', lat: 0, lng: 0, imageUrl: '', rating: 4.3 },
        ],
    };

    const spots = mockSpots[preferences.destination] || mockSpots['default'];

    return spots.slice(0, preferences.days * 3).map((spot, index) => ({
        ...spot,
        country: preferences.country || preferences.destination,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spot.name + index)}/400/300`,
    }));
}

/**
 * Extract travel spots from a TikTok video using Gemini's multimodal capabilities
 * Analyzes video content, audio, text overlays, and caption to find locations
 */
export async function extractSpotsFromVideo(
    videoBase64: string,
    caption: string,
    mimeType: string = 'video/mp4'
): Promise<ExtractedSpot[]> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are a travel content analyzer. Analyze this TikTok video and its caption to extract all travel locations, restaurants, cafes, hotels, or attractions mentioned or shown.

VIDEO CAPTION: "${caption}"

Analyze EVERYTHING in the video:
1. Visual content - Look for landmarks, storefronts, signs, menus, location names
2. Audio/speech - Listen for place names mentioned verbally
3. Text overlays - Read any text in the video (captions, location tags, titles)
4. Context clues - Identify the city/country from visual elements

For each location found, provide:
- name: The exact name of the place
- category: One of: cafe, restaurant, attraction, hotel, bar, other
- description: Brief 1-sentence description of what it is and why it's featured
- confidence: 0-1 how confident you are this is a real, identifiable place
- estimatedLocation: Your best estimate of where this is (city, country, and approximate lat/lng if you know the place)

Return ONLY valid JSON array. Example:
[
  {
    "name": "Café de Flore",
    "category": "cafe",
    "description": "Historic Parisian café famous for its literary clientele and classic French atmosphere",
    "confidence": 0.95,
    "estimatedLocation": {
      "city": "Paris",
      "country": "France",
      "lat": 48.8543,
      "lng": 2.3328
    }
  }
]

Rules:
- Only include places you can identify with reasonable confidence (>0.6)
- If you can't determine exact coordinates, provide city/country only
- Focus on places the video is recommending or featuring
- Ignore generic mentions (like "the airport" or "our hotel" without a name)
- Return empty array [] if no identifiable places are found`;

    console.log('Sending video to Gemini for analysis...');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: videoBase64
                        }
                    },
                    { text: prompt }
                ]
            }],
            generationConfig: {
                temperature: 0.3, // Lower temperature for more factual extraction
                maxOutputTokens: 4096,
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini video analysis error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini video analysis');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('Gemini video analysis complete');

    // Clean and parse response
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    try {
        const spots: ExtractedSpot[] = JSON.parse(cleanText);
        // Filter out low confidence results
        return spots.filter(spot => spot.confidence >= 0.6);
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', cleanText);
        throw new Error('Failed to parse extracted spots');
    }
}

/**
 * Extract spots from caption text only (faster, cheaper fallback)
 */
export async function extractSpotsFromCaption(caption: string): Promise<ExtractedSpot[]> {
    const prompt = `Extract all travel locations from this TikTok caption:

"${caption}"

For each location, provide a JSON array with:
- name: Place name
- category: cafe, restaurant, attraction, hotel, bar, or other
- description: Brief description
- confidence: 0-1 confidence level
- estimatedLocation: {city, country, lat, lng} if identifiable

Return ONLY valid JSON array. Return [] if no places found.`;

    try {
        const text = await callGemini(prompt);

        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

        const spots: ExtractedSpot[] = JSON.parse(cleanText.trim());
        return spots.filter(spot => spot.confidence >= 0.6);
    } catch (error) {
        console.error('Caption extraction error:', error);
        return [];
    }
}
