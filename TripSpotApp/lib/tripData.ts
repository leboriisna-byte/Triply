// Country data with flag emojis for destination search
export interface Country {
    name: string;
    code: string;
    flag: string;
    cities: string[];
}

export const countries: Country[] = [
    { name: 'Japan', code: 'JP', flag: '🇯🇵', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Nara', 'Fukuoka'] },
    { name: 'Indonesia', code: 'ID', flag: '🇮🇩', cities: ['Bali', 'Jakarta', 'Yogyakarta', 'Lombok', 'Bandung'] },
    { name: 'Thailand', code: 'TH', flag: '🇹🇭', cities: ['Bangkok', 'Chiang Mai', 'Phuket', 'Krabi', 'Pattaya'] },
    { name: 'France', code: 'FR', flag: '🇫🇷', cities: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux'] },
    { name: 'Italy', code: 'IT', flag: '🇮🇹', cities: ['Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Amalfi'] },
    { name: 'Spain', code: 'ES', flag: '🇪🇸', cities: ['Barcelona', 'Madrid', 'Seville', 'Valencia', 'Granada'] },
    { name: 'United States', code: 'US', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'San Francisco', 'Miami', 'Las Vegas', 'Chicago'] },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', cities: ['London', 'Edinburgh', 'Manchester', 'Oxford', 'Cambridge'] },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
    { name: 'South Korea', code: 'KR', flag: '🇰🇷', cities: ['Seoul', 'Busan', 'Jeju', 'Incheon', 'Gyeongju'] },
    { name: 'Australia', code: 'AU', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Gold Coast'] },
    { name: 'Greece', code: 'GR', flag: '🇬🇷', cities: ['Athens', 'Santorini', 'Mykonos', 'Crete', 'Rhodes'] },
    { name: 'Portugal', code: 'PT', flag: '🇵🇹', cities: ['Lisbon', 'Porto', 'Faro', 'Sintra', 'Madeira'] },
    { name: 'Netherlands', code: 'NL', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'] },
    { name: 'Turkey', code: 'TR', flag: '🇹🇷', cities: ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir', 'Bodrum'] },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳', cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An', 'Ha Long Bay'] },
    { name: 'Mexico', code: 'MX', flag: '🇲🇽', cities: ['Mexico City', 'Cancun', 'Tulum', 'Oaxaca', 'Guadalajara'] },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷', cities: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Florianópolis'] },
    { name: 'Egypt', code: 'EG', flag: '🇪🇬', cities: ['Cairo', 'Luxor', 'Alexandria', 'Sharm El Sheikh', 'Aswan'] },
    { name: 'Morocco', code: 'MA', flag: '🇲🇦', cities: ['Marrakech', 'Fez', 'Casablanca', 'Chefchaouen', 'Tangier'] },
];

export interface TripCategory {
    id: string;
    name: string;
    emoji: string;
}

export const tripCategories: TripCategory[] = [
    { id: 'popular', name: 'Popular', emoji: '📌' },
    { id: 'museum', name: 'Museum', emoji: '🖼️' },
    { id: 'nature', name: 'Nature', emoji: '⛰️' },
    { id: 'foodie', name: 'Foodie', emoji: '🍕' },
    { id: 'history', name: 'History', emoji: '🏛️' },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
];

export function searchDestinations(query: string): { name: string; country: string; flag: string }[] {
    if (!query.trim()) return [];

    const results: { name: string; country: string; flag: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const country of countries) {
        // Search countries
        if (country.name.toLowerCase().includes(lowerQuery)) {
            results.push({ name: country.name, country: '', flag: country.flag });
        }

        // Search cities
        for (const city of country.cities) {
            if (city.toLowerCase().includes(lowerQuery)) {
                results.push({ name: city, country: country.name, flag: country.flag });
            }
        }
    }

    return results.slice(0, 10);
}
