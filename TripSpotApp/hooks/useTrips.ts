import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Trip = Database['public']['Tables']['trips']['Row'];
type TripInsert = Database['public']['Tables']['trips']['Insert'];
type TripStop = Database['public']['Tables']['trip_stops']['Row'];

interface TripWithStops extends Trip {
    stops: TripStop[];
}

export function useTrips() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTrips(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch trips');
        } finally {
            setLoading(false);
        }
    };

    const fetchTripWithStops = async (tripId: string): Promise<TripWithStops | null> => {
        try {
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (tripError) throw tripError;

            // Fetch stops with joined spot details
            const { data: stops, error: stopsError } = await supabase
                .from('trip_stops')
                .select(`
                    *,
                    spot:spots (
                        id,
                        name,
                        lat,
                        lng,
                        description,
                        image_url,
                        category,
                        rating,
                        country
                    )
                `)
                .eq('trip_id', tripId)
                .order('day_number', { ascending: true })
                .order('order_in_day', { ascending: true });

            if (stopsError) throw stopsError;

            return { ...trip, stops: stops || [] };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch trip');
            return null;
        }
    };

    const createTrip = async (trip: TripInsert) => {
        try {
            // Generate a unique share token
            const shareToken = Math.random().toString(36).substring(2, 15);

            const { data, error } = await supabase
                .from('trips')
                .insert({ ...trip, share_token: shareToken })
                .select()
                .single();

            if (error) throw error;
            setTrips((prev) => [data, ...prev]);
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create trip');
            throw err;
        }
    };

    const updateTrip = async (id: string, updates: Partial<Trip>) => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setTrips((prev) => prev.map((t) => (t.id === id ? data : t)));
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update trip');
            throw err;
        }
    };

    const deleteTrip = async (id: string) => {
        try {
            // Get all spots associated with this trip before deleting it
            const { data: stops } = await supabase
                .from('trip_stops')
                .select('spot_id')
                .eq('trip_id', id);

            const spotIds = stops?.map(s => s.spot_id) || [];

            // Delete the trip
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Delete the associated spots
            if (spotIds.length > 0) {
                const { error: spotsError } = await supabase
                    .from('spots')
                    .delete()
                    .in('id', spotIds);

                if (spotsError) {
                    console.error('Failed to clean up spots:', spotsError);
                }
            }

            setTrips((prev) => prev.filter((trip) => trip.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete trip');
            throw err;
        }
    };

    const addStopToTrip = async (tripId: string, spotId: string, dayNumber: number, orderInDay: number) => {
        try {
            const { data, error } = await supabase
                .from('trip_stops')
                .insert({
                    trip_id: tripId,
                    spot_id: spotId,
                    day_number: dayNumber,
                    order_in_day: orderInDay,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add stop');
            throw err;
        }
    };

    // Save AI-generated spots and link them to a trip
    const saveTripItinerary = async (
        tripId: string,
        userId: string,
        itinerary: { day: number; theme?: string; spots: any[] }[]
    ) => {
        // Map AI categories to database-valid categories
        // Database accepts: 'cafe', 'restaurant', 'attraction', 'hotel', 'bar', 'other'
        // AI generates: 'popular', 'museum', 'nature', 'foodie', 'history', 'shopping'
        const mapCategory = (aiCategory: string): string => {
            const mapping: Record<string, string> = {
                'popular': 'attraction',
                'museum': 'attraction',
                'nature': 'attraction',
                'foodie': 'restaurant',
                'history': 'attraction',
                'shopping': 'other',
                'cafe': 'cafe',
                'restaurant': 'restaurant',
                'attraction': 'attraction',
                'hotel': 'hotel',
                'bar': 'bar',
                'other': 'other',
            };
            return mapping[aiCategory?.toLowerCase()] || 'attraction';
        };

        try {
            console.log(`Saving itinerary with ${itinerary.length} days to trip ${tripId}`);
            let savedCount = 0;

            // For each day in the itinerary
            for (const day of itinerary) {
                console.log(`Processing Day ${day.day}: ${day.spots.length} spots`);

                for (let orderIndex = 0; orderIndex < day.spots.length; orderIndex++) {
                    const spot = day.spots[orderIndex];
                    const dbCategory = mapCategory(spot.category);

                    console.log(`Saving spot: ${spot.name} (category: ${spot.category} -> ${dbCategory})`);

                    // First, save the spot to the spots table
                    const { data: savedSpot, error: spotError } = await supabase
                        .from('spots')
                        .insert({
                            user_id: userId,
                            name: spot.name,
                            lat: spot.lat,
                            lng: spot.lng,
                            city: spot.city || spot.name, // Add city field
                            country: spot.country || 'Unknown',
                            category: dbCategory,
                            description: spot.description,
                            image_url: spot.imageUrl,
                            rating: spot.rating,
                            source_platform: 'manual',
                        })
                        .select()
                        .single();

                    if (spotError) {
                        console.error('Error saving spot:', spot.name, spotError);
                        continue; // Skip this spot but continue with others
                    }

                    console.log(`Saved spot: ${savedSpot.name} (${savedSpot.id})`);

                    // Then link it to the trip via trip_stops
                    const { error: stopError } = await supabase
                        .from('trip_stops')
                        .insert({
                            trip_id: tripId,
                            spot_id: savedSpot.id,
                            day_number: day.day,
                            order_in_day: orderIndex + 1,
                        });

                    if (stopError) {
                        console.error('Error linking spot to trip:', stopError);
                    } else {
                        savedCount++;
                    }
                }
            }

            console.log(`Successfully saved ${savedCount} spots to database`);
            return true;
        } catch (err) {
            console.error('saveTripItinerary error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save itinerary');
            throw err;
        }
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    return {
        trips,
        loading,
        error,
        fetchTrips,
        fetchTripWithStops,
        createTrip,
        updateTrip,
        deleteTrip,
        addStopToTrip,
        saveTripItinerary,
    };
}
