export interface PlacePrediction {
    placeId: string;
    mainText: string;
    secondaryText: string;
    lat?: number;
    lng?: number;
    city?: string;
    country?: string;
    type?: string;
}

export async function searchPlacesAutocomplete(query: string): Promise<PlacePrediction[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    // Hardcoded major cities for common countries
    const majorCities: Record<string, Array<{ name: string, lat: number, lng: number }>> = {
        'japan': [
            { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
            { name: 'Osaka', lat: 34.6937, lng: 135.5023 },
            { name: 'Kyoto', lat: 35.0116, lng: 135.7681 },
            { name: 'Yokohama', lat: 35.4437, lng: 139.6380 },
        ],
        'france': [
            { name: 'Paris', lat: 48.8566, lng: 2.3522 },
            { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
            { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
        ],
        'italy': [
            { name: 'Rome', lat: 41.9028, lng: 12.4964 },
            { name: 'Milan', lat: 45.4642, lng: 9.1900 },
            { name: 'Venice', lat: 45.4408, lng: 12.3155 },
            { name: 'Florence', lat: 43.7696, lng: 11.2558 },
        ],
        'spain': [
            { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
            { name: 'Barcelona', lat: 41.3874, lng: 2.1686 },
            { name: 'Seville', lat: 37.3891, lng: -5.9845 },
        ],
        'usa': [
            { name: 'New York', lat: 40.7128, lng: -74.0060 },
            { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
            { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
        ],
        'united states': [
            { name: 'New York', lat: 40.7128, lng: -74.0060 },
            { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
            { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
        ],
    };

    const queryLower = query.toLowerCase().trim();

    // If we have hardcoded cities for this query, return them immediately as fallback
    if (majorCities[queryLower]) {
        const countryName = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
        const cities = majorCities[queryLower].map(city => ({
            placeId: `hardcoded_${city.name}`,
            mainText: city.name,
            secondaryText: countryName,
            lat: city.lat,
            lng: city.lng,
            city: city.name,
            country: countryName,
            type: 'city',
        }));

        return [
            {
                placeId: `country_${countryName}`,
                mainText: countryName,
                secondaryText: '',
                lat: cities[0].lat,
                lng: cities[0].lng,
                city: countryName,
                country: countryName,
                type: 'country',
            },
            ...cities
        ];
    }

    try {
        // Use Photon API (OpenStreetMap) - free and prioritizes major locations
        const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=20&lang=en`
        );

        if (!response.ok) {
            throw new Error(`Photon API error: ${response.status}`);
        }

        const data = await response.json();

        const features = data.features || [];

        let results: PlacePrediction[] = features
            .filter((feature: any) => {
                const props = feature.properties;
                const type = props.type;
                if (!['city', 'town', 'village', 'country', 'state', 'county', 'administrative'].includes(type)) {
                    return false;
                }
                return true;
            })
            .map((feature: any) => {
                const props = feature.properties;
                const mainText = props.name || '';
                const parts = [];

                if (props.state && props.state !== mainText) parts.push(props.state);
                if (props.country && props.country !== mainText) parts.push(props.country);

                return {
                    placeId: `photon_${feature.properties.osm_id || Math.random()}`,
                    mainText,
                    secondaryText: parts.join(', '),
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0],
                    city: props.city || props.name,
                    country: props.country || mainText,
                    type: props.type,
                };
            });

        // Check if first result is a country and add hardcoded cities
        const queryLower = query.toLowerCase().trim();
        if (majorCities[queryLower]) {
            const countryName = results[0]?.mainText || query;
            const cities = majorCities[queryLower].map(city => ({
                placeId: `hardcoded_${city.name}`,
                mainText: city.name,
                secondaryText: countryName,
                lat: city.lat,
                lng: city.lng,
                city: city.name,
                country: countryName,
                type: 'city',
            }));

            // Insert cities after the country
            if (results.length > 0 && results[0].type === 'country') {
                results = [results[0], ...cities, ...results.slice(1)];
            } else {
                results = [...cities, ...results];
            }
        }

        return results.slice(0, 10);
    } catch (error) {
        console.error('Error fetching autocomplete:', error);
        return [];
    }
}

export async function getPlaceDetails(placeId: string) {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
        console.error('Google Places API key is not configured');
        return null;
    }

    // Skip Google API for non-Google IDs
    if (placeId.startsWith('photon_') || placeId.startsWith('hardcoded_') || placeId.startsWith('country_')) {
        return {
            name: placeId.split('_')[1],
            formattedAddress: '',
            country: 'Unknown' // We rely on the search result already having this
        };
    }

    try {
        const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'displayName,formattedAddress,location,addressComponents',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Places API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching place details:', error);
        return null;
    }
}

export async function enrichSpotsWithPlaces(spots: any[]) {
    // This function can be used to enrich spots with additional place data
    // For now, just return the spots as-is
    return spots;
}
