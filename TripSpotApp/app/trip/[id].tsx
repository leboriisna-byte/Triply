import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTrips } from '../../hooks/useTrips';
import { generateItinerary, GeneratedSpot } from '../../lib/gemini';
import { Database } from '../../lib/database.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Trip = Database['public']['Tables']['trips']['Row'];

interface DayItinerary {
    day: number;
    spots: GeneratedSpot[];
}

const DAY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function TripPlannerScreen() {
    const { id, newTrip, spotsJson } = useLocalSearchParams<{
        id: string;
        newTrip?: string;
        spotsJson?: string;
    }>();
    const { fetchTripWithStops, trips, deleteTrip } = useTrips();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
    const [spots, setSpots] = useState<GeneratedSpot[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');
    const [generatingItinerary, setGeneratingItinerary] = useState(false);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        loadTrip();
    }, [id]);

    const loadTrip = async () => {
        setLoading(true);

        // Check if this is a new trip with spots
        if (newTrip === 'true' && spotsJson) {
            try {
                const parsedSpots: GeneratedSpot[] = JSON.parse(spotsJson);
                setSpots(parsedSpots);
                setShowAIPrompt(parsedSpots.length > 0);
            } catch (e) {
                console.error('Failed to parse spots:', e);
            }
        }

        // Find trip from state or fetch
        const foundTrip = trips.find(t => t.id === id);
        if (foundTrip) {
            setTrip(foundTrip);
        }

        setLoading(false);
    };

    const handlePlanForMe = async () => {
        if (spots.length === 0) return;

        setGeneratingItinerary(true);
        setShowAIPrompt(false);

        try {
            const destination = trip?.destination || 'Trip';
            const days = trip?.duration_days || 3;
            const generated = await generateItinerary(destination, spots, days);
            setItinerary(generated);

            // Fit map to show all spots
            if (mapRef.current && spots.length > 0) {
                const coordinates = spots.map(s => ({ latitude: s.lat, longitude: s.lng }));
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
                    animated: true,
                });
            }
        } catch (error) {
            console.error('Failed to generate itinerary:', error);
            // Fallback - just distribute spots evenly
            const days = trip?.duration_days || 3;
            const spotsPerDay = Math.ceil(spots.length / days);
            const fallback = [];
            for (let d = 0; d < days; d++) {
                fallback.push({
                    day: d + 1,
                    spots: spots.slice(d * spotsPerDay, (d + 1) * spotsPerDay),
                });
            }
            setItinerary(fallback);
        } finally {
            setGeneratingItinerary(false);
        }
    };

    const handlePlanMyself = () => {
        setShowAIPrompt(false);
        // Create empty itinerary structure
        const emptyItinerary: DayItinerary[] = [];
        for (let i = 1; i <= (trip?.duration_days || 1); i++) {
            emptyItinerary.push({ day: i, spots: [] });
        }
        setItinerary(emptyItinerary);
    };

    const handleDeleteTrip = () => {
        Alert.alert(
            'Delete Trip',
            'Are you sure you want to delete this trip? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (id) {
                                await deleteTrip(id);
                            }
                            router.back();
                        } catch (error) {
                            console.error('Failed to delete trip:', error);
                            Alert.alert('Error', 'Failed to delete trip');
                        }
                    },
                },
            ]
        );
    };

    const getMapRegion = () => {
        if (spots.length === 0) {
            return {
                latitude: 35.6762,
                longitude: 139.6503,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            };
        }

        const lats = spots.map(s => s.lat);
        const lngs = spots.map(s => s.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const latDelta = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 1.5);
        const lngDelta = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 1.5);

        return {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
        };
    };

    const getAllSpotsWithDayInfo = () => {
        const spotsWithDay: { spot: GeneratedSpot; dayIndex: number; orderIndex: number }[] = [];
        itinerary.forEach((day, dayIndex) => {
            day.spots.forEach((spot, orderIndex) => {
                spotsWithDay.push({ spot, dayIndex, orderIndex });
            });
        });
        return spotsWithDay;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Section (Top) */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={getMapRegion()}
                    showsUserLocation
                >
                    {/* Markers */}
                    {getAllSpotsWithDayInfo().map(({ spot, dayIndex, orderIndex }, index) => (
                        <Marker
                            key={`marker-${index}`}
                            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                            title={spot.name}
                        >
                            <View style={[styles.markerContainer, { backgroundColor: dayIndex !== -1 ? DAY_COLORS[dayIndex % DAY_COLORS.length] : '#9CA3AF' }]}>
                                <Text style={styles.markerText}>{orderIndex + 1}</Text>
                            </View>
                        </Marker>
                    ))}

                    {/* Route polylines per day */}
                    {itinerary.map((day, dayIndex) => {
                        if (day.spots.length < 2) return null;
                        const coordinates = day.spots.map(s => ({ latitude: s.lat, longitude: s.lng }));
                        return (
                            <Polyline
                                key={`route-${dayIndex}`}
                                coordinates={coordinates}
                                strokeColor={DAY_COLORS[dayIndex % DAY_COLORS.length]}
                                strokeWidth={4}
                            />
                        );
                    })}
                </MapView>

                {/* Back Button */}
                <View style={styles.mapHeader}>
                    <TouchableOpacity style={styles.mapButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#1F2937" />
                    </TouchableOpacity>

                    {/* Map Edit Controls - optional, maybe just for the map view */}
                    <TouchableOpacity style={styles.mapEditButton}>
                        <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.mapEditText}>Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Sheet Content */}
            <View style={styles.bottomSheet}>
                {/* Header */}
                <View style={styles.tripHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                            <Text style={styles.tripName}>{trip?.name || 'My Trip'}</Text>
                            <TouchableOpacity>
                                <Ionicons name="pencil" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.tripMeta}>
                                {trip?.duration_days} days {trip?.duration_days && trip.duration_days > 1 ? `${trip.duration_days - 1} nights` : ''} • Choose dates
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.shareButton}>
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.shareText}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                        onPress={() => setActiveTab('overview')}
                    >
                        <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'itinerary' && styles.tabActive]}
                        onPress={() => setActiveTab('itinerary')}
                    >
                        <Text style={[styles.tabText, activeTab === 'itinerary' && styles.tabTextActive]}>Itinerary</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'overview' ? (
                        <>
                            <View style={styles.overviewHeader}>
                                <Text style={styles.overviewEmoji}>🚋</Text>
                                <Text style={styles.overviewTitle}>Itinerary Overview</Text>
                            </View>

                            {itinerary.map((day) => (
                                <View key={day.day} style={styles.dayCard}>
                                    <Text style={styles.dayCardTitle}>Day {day.day}</Text>
                                    <View style={styles.dayCardContent}>
                                        <Text style={styles.dayCardRoute}>
                                            {day.spots.map(s => s.name).join(' → ') || 'No spots planned'}
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            {spots.length > itinerary.flatMap(d => d.spots).length && (
                                <View style={styles.unplannedCard}>
                                    <Text style={styles.unplannedCardTitle}>Unplanned</Text>
                                    <Text style={styles.unplannedCardText}>
                                        {spots.length - itinerary.flatMap(d => d.spots).length} spots yet to visit
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        /* Itinerary View (Detailed) */
                        itinerary.map((day) => (
                            <View key={day.day} style={styles.daySection}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayTitle}>Day {day.day}</Text>
                                    {/* Optional Optimize Button */}
                                </View>
                                {day.spots.map((spot, index) => (
                                    <View key={index} style={styles.itinerarySpot}>
                                        <Text style={styles.itinerarySpotTime}>10:00</Text>
                                        {/* Placeholder time */}
                                        <View style={styles.timelineContainer}>
                                            <View style={[styles.timelineDot, { backgroundColor: DAY_COLORS[(day.day - 1) % DAY_COLORS.length] }]} />
                                            {index < day.spots.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.itinerarySpotContent}>
                                            <Image source={{ uri: spot.imageUrl }} style={styles.itinerarySpotImage} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itinerarySpotName}>{spot.name}</Text>
                                                <Text style={styles.itinerarySpotCategory}>{spot.category}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapContainer: {
        height: SCREEN_HEIGHT * 0.45,
    },
    map: {
        flex: 1,
    },
    mapHeader: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mapButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    mapEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    mapEditText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    markerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    markerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // AI Prompt
    aiPromptOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    aiPromptCard: {
        width: SCREEN_WIDTH - 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    aiPromptTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 16,
    },
    miniMapContainer: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    miniMap: {
        flex: 1,
    },
    previewMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    planningPreview: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    planningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    planningText: {
        color: '#6B7280',
        fontSize: 14,
    },
    dayLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    previewSpot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    previewSpotNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewSpotNumberText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    previewSpotName: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
    },
    planForMeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2937',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        marginBottom: 12,
    },
    planForMeText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    planMyselfButton: {
        paddingVertical: 8,
    },
    planMyselfText: {
        color: '#6B7280',
        fontSize: 14,
    },
    closePromptButton: {
        position: 'absolute',
        bottom: -60,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Bottom Sheet
    bottomSheet: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -30,
        paddingTop: 10,
    },
    generatingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    generatingText: {
        color: '#6B7280',
        fontSize: 16,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    tripName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000000',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tripMeta: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
        height: 40,
        alignSelf: 'flex-start',
    },
    shareText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 24,
    },
    tab: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#000000',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    tabTextActive: {
        color: '#000000',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: '#FFFFFF',
    },
    overviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    overviewEmoji: {
        fontSize: 24,
    },
    overviewTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },
    dayCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    dayCardTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000000',
        marginBottom: 12,
    },
    dayCardContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCardRoute: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
    },
    unplannedCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    unplannedCardTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000000',
        marginBottom: 4,
    },
    unplannedCardText: {
        fontSize: 15,
        color: '#9CA3AF',
    },
    // Itinerary View Styles
    daySection: {
        marginBottom: 30,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000000',
    },
    itinerarySpot: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingLeft: 10,
    },
    itinerarySpotTime: {
        width: 50,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        paddingTop: 2,
    },
    timelineContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 20,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
    },
    itinerarySpotContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    itinerarySpotImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    itinerarySpotName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    itinerarySpotCategory: {
        fontSize: 13,
        color: '#6B7280',
    },
});
