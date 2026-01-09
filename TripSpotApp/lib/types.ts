// User types
export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
}

// Spot types
export type SpotCategory = 'cafe' | 'restaurant' | 'attraction' | 'hotel' | 'bar' | 'other';
export type SourcePlatform = 'tiktok' | 'instagram' | 'manual';

export interface Spot {
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
}

// Trip types
export interface Trip {
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
}

export interface TripStop {
    id: string;
    trip_id: string;
    spot_id: string;
    day_number: number;
    order_in_day: number;
    notes: string | null;
    scheduled_time: string | null;
    spot?: Spot;
}

export interface TripWithStops extends Trip {
    stops: TripStop[];
}

// Travel Guide types
export interface TravelGuide {
    id: string;
    city: string;
    country: string;
    name: string;
    cover_image_url: string | null;
    spot_count: number;
    is_featured: boolean;
}

// Navigation types
export type RootStackParamList = {
    '(tabs)': undefined;
    'import': undefined;
    'spot/[id]': { id: string };
    'trip/[id]': { id: string };
    'trip/new': undefined;
    'profile': undefined;
    'shared/[token]': { token: string };
};
