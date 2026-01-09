export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type SpotCategory = 'cafe' | 'restaurant' | 'attraction' | 'hotel' | 'bar' | 'other';
export type SourcePlatform = 'tiktok' | 'instagram' | 'manual';

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string | null;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string;
                };
            };
            spots: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    lat: number;
                    lng: number;
                    address: string | null;
                    country: string;
                    category: SpotCategory;
                    description: string | null;
                    image_url: string | null;
                    rating: number | null;
                    review_count: number | null;
                    source_url: string | null;
                    source_platform: SourcePlatform;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    lat: number;
                    lng: number;
                    address?: string | null;
                    country: string;
                    category?: SpotCategory;
                    description?: string | null;
                    image_url?: string | null;
                    rating?: number | null;
                    review_count?: number | null;
                    source_url?: string | null;
                    source_platform?: SourcePlatform;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    lat?: number;
                    lng?: number;
                    address?: string | null;
                    country?: string;
                    category?: SpotCategory;
                    description?: string | null;
                    image_url?: string | null;
                    rating?: number | null;
                    review_count?: number | null;
                    source_url?: string | null;
                    source_platform?: SourcePlatform;
                    created_at?: string;
                };
            };
            trips: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    destination: string;
                    cover_image_url: string | null;
                    start_date: string | null;
                    end_date: string | null;
                    duration_days: number;
                    share_token: string | null;
                    is_public: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    destination: string;
                    cover_image_url?: string | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    duration_days?: number;
                    share_token?: string | null;
                    is_public?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    destination?: string;
                    cover_image_url?: string | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    duration_days?: number;
                    share_token?: string | null;
                    is_public?: boolean;
                    created_at?: string;
                };
            };
            trip_stops: {
                Row: {
                    id: string;
                    trip_id: string;
                    spot_id: string;
                    day_number: number;
                    order_in_day: number;
                    notes: string | null;
                    scheduled_time: string | null;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    spot_id: string;
                    day_number: number;
                    order_in_day: number;
                    notes?: string | null;
                    scheduled_time?: string | null;
                };
                Update: {
                    id?: string;
                    trip_id?: string;
                    spot_id?: string;
                    day_number?: number;
                    order_in_day?: number;
                    notes?: string | null;
                    scheduled_time?: string | null;
                };
            };
            travel_guides: {
                Row: {
                    id: string;
                    city: string;
                    country: string;
                    name: string;
                    cover_image_url: string | null;
                    spot_count: number;
                    is_featured: boolean;
                };
                Insert: {
                    id?: string;
                    city: string;
                    country: string;
                    name: string;
                    cover_image_url?: string | null;
                    spot_count?: number;
                    is_featured?: boolean;
                };
                Update: {
                    id?: string;
                    city?: string;
                    country?: string;
                    name?: string;
                    cover_image_url?: string | null;
                    spot_count?: number;
                    is_featured?: boolean;
                };
            };
        };
    };
}
