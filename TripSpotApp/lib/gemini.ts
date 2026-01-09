import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export interface GeneratedSpot {
    name: string;
    description: string;
    category: 'popular' | 'museum' | 'nature' | 'foodie' | 'history' | 'shopping';
    lat: number;
    lng: number;
    imageUrl: string;
    rating?: number;
}

export interface TripPreferences {
    destination: string;
    country: string;
    categories: string[];
    days: number;
}

export async function generateSpots(preferences: TripPreferences): Promise<GeneratedSpot[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a travel expert. Generate ${Math.min(preferences.days * 4, 15)} unique travel spots for a trip to ${preferences.destination}, ${preferences.country}.

The traveler is interested in: ${preferences.categories.join(', ')}.
Trip duration: ${preferences.days} days.

For each spot, provide:
- name: The name of the place
- description: A short 1-2 sentence description
- category: One of: popular, museum, nature, foodie, history, shopping
- lat: Latitude coordinate (accurate for this location)
- lng: Longitude coordinate (accurate for this location)
- rating: A rating between 4.0 and 5.0

Return ONLY a valid JSON array with no markdown formatting. Example:
[{"name": "Example Place", "description": "A beautiful landmark", "category": "popular", "lat": 35.6762, "lng": 139.6503, "rating": 4.7}]`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean the response - remove markdown code blocks if present
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.slice(7);
        }
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.slice(3);
        }
        if (cleanText.endsWith('```')) {
            cleanText = cleanText.slice(0, -3);
        }
        cleanText = cleanText.trim();

        const spots: GeneratedSpot[] = JSON.parse(cleanText);

        // Add placeholder images based on category
        return spots.map(spot => ({
            ...spot,
            imageUrl: getImageForCategory(spot.category, preferences.destination),
        }));
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate spots. Please try again.');
    }
}

export async function generateItinerary(
    destination: string,
    spots: GeneratedSpot[],
    days: number
): Promise<{ day: number; spots: GeneratedSpot[] }[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const spotNames = spots.map((s, i) => `${i}: ${s.name}`).join('\n');

    const prompt = `You are a travel planner. Create an optimized ${days}-day itinerary for ${destination}.

Available spots (index: name):
${spotNames}

Rules:
- Distribute spots across ${days} days
- Group nearby spots on the same day
- Maximum 5 spots per day
- Consider travel time between spots

Return ONLY a valid JSON array. Example:
[{"day": 1, "spotIndices": [0, 2, 5]}, {"day": 2, "spotIndices": [1, 3, 4]}]`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        const itinerary: { day: number; spotIndices: number[] }[] = JSON.parse(cleanText);

        return itinerary.map(dayPlan => ({
            day: dayPlan.day,
            spots: dayPlan.spotIndices
                .filter(i => i >= 0 && i < spots.length)
                .map(i => spots[i]),
        }));
    } catch (error) {
        console.error('Gemini itinerary error:', error);
        // Fallback: distribute spots evenly
        const spotsPerDay = Math.ceil(spots.length / days);
        const fallbackItinerary = [];
        for (let d = 0; d < days; d++) {
            fallbackItinerary.push({
                day: d + 1,
                spots: spots.slice(d * spotsPerDay, (d + 1) * spotsPerDay),
            });
        }
        return fallbackItinerary;
    }
}

function getImageForCategory(category: string, destination: string): string {
    const query = encodeURIComponent(`${destination} ${category} travel`);
    // Using Unsplash source for placeholder images
    const seed = Math.random().toString(36).substring(7);
    return `https://source.unsplash.com/400x300/?${query}&sig=${seed}`;
}
