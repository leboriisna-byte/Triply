// Gemini AI integration using REST API for better compatibility

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

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

async function callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
                maxOutputTokens: 2048,
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API Response:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
}

export async function generateSpots(preferences: TripPreferences): Promise<GeneratedSpot[]> {
    const prompt = `You are a travel expert. Generate ${Math.min(preferences.days * 4, 12)} unique travel spots for a trip to ${preferences.destination}, ${preferences.country}.

The traveler is interested in: ${preferences.categories.join(', ')}.
Trip duration: ${preferences.days} days.

For each spot provide JSON with:
- name: Place name
- description: 1-2 sentence description
- category: One of: popular, museum, nature, foodie, history, shopping
- lat: Latitude (accurate)
- lng: Longitude (accurate)  
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
            imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spot.name + index)}/400/300`,
        }));
    } catch (error) {
        console.error('Gemini error:', error);
        // Return mock data as fallback
        return getMockSpots(preferences);
    }
}

export async function generateItinerary(
    destination: string,
    spots: GeneratedSpot[],
    days: number
): Promise<{ day: number; spots: GeneratedSpot[] }[]> {
    // Simple distribution fallback (works without API)
    const spotsPerDay = Math.ceil(spots.length / days);
    const itinerary = [];

    for (let d = 0; d < days; d++) {
        itinerary.push({
            day: d + 1,
            spots: spots.slice(d * spotsPerDay, (d + 1) * spotsPerDay),
        });
    }

    return itinerary;
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
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spot.name + index)}/400/300`,
    }));
}
