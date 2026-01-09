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
    const { fetchTripWithStops, trips } = useTrips();
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
        if (!trip || spots.length === 0) return;

        setGeneratingItinerary(true);
        setShowAIPrompt(false);

        try {
            const generated = await generateItinerary(trip.destination, spots, trip.duration_days);
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
            {/* Map */}
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
                            <View style={[styles.markerContainer, { backgroundColor: DAY_COLORS[dayIndex % DAY_COLORS.length] }]}>
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
                                strokeWidth={3}
                                lineDashPattern={[1]}
                            />
                        );
                    })}
                </MapView>

                {/* Back & Edit buttons */}
                <View style={styles.mapHeader}>
                    <TouchableOpacity style={styles.mapButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View style={styles.dayBadges}>
                        {itinerary.map((day, i) => (
                            <View key={i} style={[styles.dayBadge, { backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }]}>
                                <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.editButton}>
                        <Ionicons name="pencil" size={16} color="#3B82F6" />
                        <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* AI Planning Prompt */}
            {showAIPrompt && (
                <View style={styles.aiPromptOverlay}>
                    <View style={styles.aiPromptCard}>
                        <Text style={styles.aiPromptTitle}>
                            Your days aren't full yet!{'\n'}Want us to add some places we{'\n'}think you'll love?
                        </Text>

                        {/* Mini Map Preview */}
                        <View style={styles.miniMapContainer}>
                            <MapView
                                style={styles.miniMap}
                                provider={PROVIDER_DEFAULT}
                                region={getMapRegion()}
                                scrollEnabled={false}
                                zoomEnabled={false}
                            >
                                {spots.slice(0, 3).map((spot, index) => (
                                    <Marker
                                        key={`preview-${index}`}
                                        coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                                    >
                                        <View style={[styles.previewMarker, { backgroundColor: DAY_COLORS[0] }]}>
                                            <Text style={styles.markerText}>{index + 1}</Text>
                                        </View>
                                    </Marker>
                                ))}
                            </MapView>
                        </View>

                        <View style={styles.planningPreview}>
                            <View style={styles.planningHeader}>
                                <Ionicons name="sparkles" size={16} color="#6B7280" />
                                <Text style={styles.planningText}>Planning your perfect trip...</Text>
                            </View>
                            <Text style={styles.dayLabel}>Day 1</Text>
                            {spots.slice(0, 3).map((spot, index) => (
                                <View key={index} style={styles.previewSpot}>
                                    <View style={styles.previewSpotNumber}>
                                        <Text style={styles.previewSpotNumberText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.previewSpotName}>{spot.name}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.planForMeButton}
                            onPress={handlePlanForMe}
                        >
                            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                            <Text style={styles.planForMeText}>Yes, plan for me!</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.planMyselfButton}
                            onPress={handlePlanMyself}
                        >
                            <Text style={styles.planMyselfText}>No, I'll plan myself</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closePromptButton} onPress={handlePlanMyself}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                {generatingItinerary ? (
                    <View style={styles.generatingContainer}>
                        <ActivityIndicator color="#3B82F6" />
                        <Text style={styles.generatingText}>Creating your perfect itinerary...</Text>
                    </View>
                ) : (
                    <>
                        {/* Trip Header */}
                        <View style={styles.tripHeader}>
                            <View>
                                <Text style={styles.tripName}>{trip?.name || 'My Trip'}</Text>
                                <Text style={styles.tripMeta}>
                                    {trip?.duration_days} days • Choose dates
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.shareButton}>
                                <Ionicons name="share-outline" size={20} color="#1F2937" />
                                <Text style={styles.shareText}>Share</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabs}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                                onPress={() => setActiveTab('overview')}
                            >
                                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                                    Overview
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'itinerary' && styles.tabActive]}
                                onPress={() => setActiveTab('itinerary')}
                            >
                                <Text style={[styles.tabText, activeTab === 'itinerary' && styles.tabTextActive]}>
                                    Itinerary
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {activeTab === 'overview' ? (
                                <>
                                    <View style={styles.overviewHeader}>
                                        <Text style={styles.overviewEmoji}>🗺️</Text>
                                        <Text style={styles.overviewTitle}>Itinerary Overview</Text>
                                    </View>

                                    {itinerary.map((day) => (
                                        <View key={day.day} style={styles.daySummary}>
                                            <Text style={styles.daySummaryTitle}>Day {day.day}</Text>
                                            <Text style={styles.daySummarySpots}>
                                                {day.spots.map(s => s.name).join(' → ') || 'No spots yet'}
                                            </Text>
                                        </View>
                                    ))}

                                    {spots.length > 0 && itinerary.flatMap(d => d.spots).length < spots.length && (
                                        <View style={styles.unplannedSection}>
                                            <Text style={styles.unplannedTitle}>Unplanned</Text>
                                            <Text style={styles.unplannedText}>
                                                {spots.length - itinerary.flatMap(d => d.spots).length} spots not yet planned
                                            </Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <>
                                    {itinerary.map((day) => (
                                        <View key={day.day} style={styles.daySection}>
                                            <View style={styles.dayHeader}>
                                                <Text style={styles.dayTitle}>Day {day.day}</Text>
                                                <TouchableOpacity style={styles.optimizeButton}>
                                                    <Ionicons name="flash" size={16} color="#3B82F6" />
                                                    <Text style={styles.optimizeText}>Optimize</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {day.spots.length === 0 ? (
                                                <TouchableOpacity style={styles.addPlaceButton}>
                                                    <Ionicons name="add" size={20} color="#3B82F6" />
                                                    <Text style={styles.addPlaceText}>Add a place</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                day.spots.map((spot, index) => (
                                                    <View key={index} style={styles.itinerarySpot}>
                                                        <View style={[styles.spotBadge, { backgroundColor: DAY_COLORS[day.day - 1] }]}>
                                                            <Text style={styles.spotBadgeText}>{index + 1}</Text>
                                                        </View>
                                                        <Image
                                                            source={{ uri: spot.imageUrl }}
                                                            style={styles.itinerarySpotImage}
                                                        />
                                                        <View style={styles.itinerarySpotInfo}>
                                                            <Text style={styles.itinerarySpotName}>{spot.name}</Text>
                                                            <Text style={styles.itinerarySpotCategory}>
                                                                {spot.category.charAt(0).toUpperCase() + spot.category.slice(1)}
                                                            </Text>
                                                        </View>
                                                        <Ionicons name="reorder-three" size={24} color="#9CA3AF" />
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    </>
                )}
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
        top: 50,
        left: 16,
        right: 16,
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
    dayBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    dayBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    dayBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    editText: {
        color: '#3B82F6',
        fontWeight: '500',
    },
    markerContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    markerText: {
        color: '#FFFFFF',
        fontSize: 12,
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
        marginTop: -24,
        paddingTop: 20,
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    tripName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    tripMeta: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    shareText: {
        color: '#1F2937',
        fontWeight: '500',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#1F2937',
    },
    tabText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    tabTextActive: {
        color: '#1F2937',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    overviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    overviewEmoji: {
        fontSize: 20,
    },
    overviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    daySummary: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    daySummaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    daySummarySpots: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    unplannedSection: {
        marginTop: 8,
    },
    unplannedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    unplannedText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },
    daySection: {
        marginBottom: 24,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    optimizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    optimizeText: {
        color: '#3B82F6',
        fontWeight: '500',
    },
    addPlaceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    addPlaceText: {
        color: '#3B82F6',
        fontWeight: '500',
    },
    itinerarySpot: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 12,
    },
    spotBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spotBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    itinerarySpotImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    itinerarySpotInfo: {
        flex: 1,
    },
    itinerarySpotName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    itinerarySpotCategory: {
        fontSize: 13,
        color: '#6B7280',
    },
});
