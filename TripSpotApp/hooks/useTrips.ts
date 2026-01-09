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

            const { data: stops, error: stopsError } = await supabase
                .from('trip_stops')
                .select('*')
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
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', id);

            if (error) throw error;
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
    };
}
