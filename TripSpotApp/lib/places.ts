// Google Places API integration for geocoding and place enrichment

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export interface PlaceDetails {
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    address: string;
    country: string;
    rating?: number;
    reviewCount?: number;
    photoUrl?: string;
    types: string[];
}

interface PlacesTextSearchResult {
    places?: Array<{
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
        rating?: number;
        userRatingCount?: number;
        types?: string[];
        photos?: Array<{ name: string }>;
    }>;
}

/**
 * Search for a place by name and optional location context
 * Uses the new Google Places API (v1)
 */
export async function searchPlace(
    query: string,
    locationContext?: { city?: string; country?: string }
): Promise<PlaceDetails | null> {
    if (!GOOGLE_PLACES_API_KEY) {
        console.warn('Google Places API key not configured');
        return null;
    }

    // Build search query with location context
    let searchQuery = query;
    if (locationContext?.city) {
        searchQuery += `, ${locationContext.city}`;
    }
    if (locationContext?.country) {
        searchQuery += `, ${locationContext.country}`;
    }

    console.log('Searching for place:', searchQuery);

    try {
        // Use the new Places API (v1) with Text Search
        const response = await fetch(
            'https://places.googleapis.com/v1/places:searchText',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos',
                },
                body: JSON.stringify({
                    textQuery: searchQuery,
                    maxResultCount: 1,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Places API error:', response.status, errorText);
            return null;
        }

        const data: PlacesTextSearchResult = await response.json();

        if (!data.places || data.places.length === 0) {
            console.log('No places found for:', searchQuery);
            return null;
        }

        const place = data.places[0];

        // Extract country from address
        const addressParts = place.formattedAddress?.split(', ') || [];
        const country = addressParts[addressParts.length - 1] || 'Unknown';

        // Get photo URL if available
        let photoUrl: string | undefined;
        if (place.photos && place.photos.length > 0) {
            photoUrl = await getPlacePhotoUrl(place.photos[0].name);
        }

        return {
            placeId: place.id,
            name: place.displayName?.text || query,
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0,
            address: place.formattedAddress || '',
            country,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            photoUrl,
            types: place.types || [],
        };
    } catch (error) {
        console.error('Place search error:', error);
        return null;
    }
}

/**
 * Get a photo URL from a photo reference
 */
async function getPlacePhotoUrl(photoName: string): Promise<string | undefined> {
    if (!GOOGLE_PLACES_API_KEY || !photoName) return undefined;

    // Use the Places API photo endpoint
    // Format: https://places.googleapis.com/v1/{photoName}/media?maxHeightPx=400&key={API_KEY}
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`;
}

/**
 * Enrich multiple spots with Google Places data
 * Returns enriched spots with accurate coordinates and photos
 */
export async function enrichSpotsWithPlaces(
    spots: Array<{
        name: string;
        category: string;
        description: string;
        estimatedLocation?: {
            city?: string;
            country?: string;
            lat?: number;
            lng?: number;
        };
    }>
): Promise<Array<{
    name: string;
    category: string;
    description: string;
    lat: number;
    lng: number;
    address: string;
    country: string;
    rating?: number;
    reviewCount?: number;
    imageUrl?: string;
    placeId?: string;
}>> {
    const enrichedSpots = await Promise.all(
        spots.map(async (spot) => {
            try {
                const placeDetails = await searchPlace(spot.name, {
                    city: spot.estimatedLocation?.city,
                    country: spot.estimatedLocation?.country,
                });

                if (placeDetails) {
                    return {
                        name: placeDetails.name,
                        category: spot.category,
                        description: spot.description,
                        lat: placeDetails.lat,
                        lng: placeDetails.lng,
                        address: placeDetails.address,
                        country: placeDetails.country,
                        rating: placeDetails.rating,
                        reviewCount: placeDetails.reviewCount,
                        imageUrl: placeDetails.photoUrl,
                        placeId: placeDetails.placeId,
                    };
                }
            } catch (error) {
                console.error('Error enriching spot:', spot.name, error);
            }

            // Fallback to original data if Places API fails
            return {
                name: spot.name,
                category: spot.category,
                description: spot.description,
                lat: spot.estimatedLocation?.lat || 0,
                lng: spot.estimatedLocation?.lng || 0,
                address: '',
                country: spot.estimatedLocation?.country || 'Unknown',
                rating: undefined,
                reviewCount: undefined,
                imageUrl: undefined,
                placeId: undefined,
            };
        })
    );

    return enrichedSpots;
}
