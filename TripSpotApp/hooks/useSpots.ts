import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Spot = Database['public']['Tables']['spots']['Row'];
type SpotInsert = Database['public']['Tables']['spots']['Insert'];

export function useSpots() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSpots = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('spots')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSpots(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch spots');
        } finally {
            setLoading(false);
        }
    };

    const addSpot = async (spot: SpotInsert) => {
        try {
            const { data, error } = await supabase
                .from('spots')
                .insert(spot)
                .select()
                .single();

            if (error) throw error;
            setSpots((prev) => [data, ...prev]);
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add spot');
            throw err;
        }
    };

    const deleteSpot = async (id: string) => {
        try {
            const { error } = await supabase
                .from('spots')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSpots((prev) => prev.filter((spot) => spot.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete spot');
            throw err;
        }
    };

    const getSpotsByCountry = () => {
        const grouped: Record<string, Spot[]> = {};
        spots.forEach((spot) => {
            if (!grouped[spot.country]) {
                grouped[spot.country] = [];
            }
            grouped[spot.country].push(spot);
        });
        return grouped;
    };

    useEffect(() => {
        fetchSpots();
    }, []);

    return {
        spots,
        loading,
        error,
        fetchSpots,
        addSpot,
        deleteSpot,
        getSpotsByCountry,
    };
}
