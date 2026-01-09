import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type TravelGuide = Database['public']['Tables']['travel_guides']['Row'];

export function useTravelGuides() {
    const [guides, setGuides] = useState<TravelGuide[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGuides = async (featuredOnly = false) => {
        try {
            setLoading(true);
            let query = supabase.from('travel_guides').select('*');

            if (featuredOnly) {
                query = query.eq('is_featured', true);
            }

            const { data, error } = await query.order('spot_count', { ascending: false });

            if (error) throw error;
            setGuides(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch guides');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuides(true); // Fetch featured guides by default
    }, []);

    return {
        guides,
        loading,
        error,
        fetchGuides,
    };
}
