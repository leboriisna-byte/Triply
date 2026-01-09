import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_DEFAULT, Marker } from "react-native-maps";
import { router } from "expo-router";
import { useSpots } from "../../hooks/useSpots";
import { useTrips } from "../../hooks/useTrips";
import { useState } from "react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MapScreen() {
    const { spots, loading: spotsLoading } = useSpots();
    const { trips, loading: tripsLoading } = useTrips();
    const [activeTab, setActiveTab] = useState<'spots' | 'trips'>('trips');

    return (
        <View style={styles.container}>
            {/* Map Container */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                        latitude: 48.8566,
                        longitude: 2.3522,
                        latitudeDelta: 30,
                        longitudeDelta: 30,
                    }}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    {activeTab === 'spots' && spots.map((spot) => (
                        <Marker
                            key={spot.id}
                            coordinate={{
                                latitude: spot.lat,
                                longitude: spot.lng,
                            }}
                            title={spot.name}
                            description={spot.address || spot.country}
                            onCalloutPress={() => router.push(`/spot/${spot.id}`)}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.marker}>
                                    <Ionicons
                                        name={getCategoryIcon(spot.category)}
                                        size={16}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </Marker>
                    ))}
                </MapView>
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <SafeAreaView edges={["bottom"]}>
                    <View style={styles.sheetContent}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        {/* Tab Switcher */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'trips' && styles.tabActive]}
                                onPress={() => setActiveTab('trips')}
                            >
                                <Ionicons name="airplane" size={18} color={activeTab === 'trips' ? '#3B82F6' : '#9CA3AF'} />
                                <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>
                                    My Trips ({trips.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'spots' && styles.tabActive]}
                                onPress={() => setActiveTab('spots')}
                            >
                                <Ionicons name="location" size={18} color={activeTab === 'spots' ? '#3B82F6' : '#9CA3AF'} />
                                <Text style={[styles.tabText, activeTab === 'spots' && styles.tabTextActive]}>
                                    Saved Spots ({spots.length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'trips' ? (
                            // Trips Tab
                            trips.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIcon}>
                                        <Ionicons name="airplane-outline" size={32} color="#1991E1" />
                                    </View>
                                    <Text style={styles.emptyTitle}>No trips yet</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Create your first AI-powered trip!
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.createButton}
                                        onPress={() => router.push("/trip/new")}
                                    >
                                        <Text style={styles.createButtonText}>Create Trip</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <ScrollView style={styles.tripsList} showsVerticalScrollIndicator={false}>
                                    {trips.map((trip) => (
                                        <TouchableOpacity
                                            key={trip.id}
                                            style={styles.tripItem}
                                            onPress={() => router.push(`/trip/${trip.id}`)}
                                        >
                                            <View style={styles.tripIcon}>
                                                <Text style={styles.tripEmoji}>🗺️</Text>
                                            </View>
                                            <View style={styles.tripInfo}>
                                                <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
                                                <Text style={styles.tripLocation} numberOfLines={1}>
                                                    {trip.destination} • {trip.duration_days} days
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )
                        ) : (
                            // Spots Tab
                            spots.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIcon}>
                                        <Ionicons name="location-outline" size={32} color="#1991E1" />
                                    </View>
                                    <Text style={styles.emptyTitle}>No spots saved yet</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Import spots from TikTok or Instagram
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.createButton}
                                        onPress={() => router.push("/import")}
                                    >
                                        <Text style={styles.createButtonText}>Import Spots</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <ScrollView style={styles.spotsList} showsVerticalScrollIndicator={false}>
                                    {spots.map((spot) => (
                                        <TouchableOpacity
                                            key={spot.id}
                                            style={styles.spotItem}
                                            onPress={() => router.push(`/spot/${spot.id}`)}
                                        >
                                            <View style={styles.spotIcon}>
                                                <Ionicons
                                                    name={getCategoryIcon(spot.category)}
                                                    size={20}
                                                    color="#3B82F6"
                                                />
                                            </View>
                                            <View style={styles.spotInfo}>
                                                <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
                                                <Text style={styles.spotLocation} numberOfLines={1}>
                                                    {spot.country}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </View>
    );
}

function getCategoryIcon(category: string): "cafe" | "restaurant" | "location" | "bed" | "wine" | "location-outline" {
    switch (category) {
        case "cafe":
            return "cafe";
        case "restaurant":
            return "restaurant";
        case "attraction":
            return "location";
        case "hotel":
            return "bed";
        case "bar":
            return "wine";
        default:
            return "location-outline";
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        height: SCREEN_HEIGHT * 0.55,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: "center",
    },
    marker: {
        backgroundColor: "#3B82F6",
        borderRadius: 20,
        padding: 8,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: "#D1D5DB",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
    },
    sheetSubtitle: {
        color: "#6B7280",
        fontSize: 14,
    },
    importButton: {
        backgroundColor: "#000000",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    importButtonText: {
        color: "#FFFFFF",
        fontWeight: "500",
        fontSize: 14,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        backgroundColor: "#DBEAFE",
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        color: "#4B5563",
        fontSize: 16,
    },
    emptySubtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        marginTop: 4,
    },
    spotsList: {
        gap: 8,
    },
    spotItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
    },
    spotIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#DBEAFE",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    spotInfo: {
        flex: 1,
        marginLeft: 12,
    },
    spotName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#111827",
    },
    spotLocation: {
        fontSize: 14,
        color: "#6B7280",
    },
    viewAllButton: {
        alignItems: "center",
        paddingVertical: 12,
    },
    viewAllText: {
        color: "#3B82F6",
        fontWeight: "500",
    },
    tabContainer: {
        flexDirection: "row",
        marginBottom: 16,
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    tabActive: {
        backgroundColor: "#DBEAFE",
    },
    tabText: {
        fontSize: 14,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    tabTextActive: {
        color: "#3B82F6",
    },
    createButton: {
        backgroundColor: "#1F2937",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 16,
    },
    createButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    tripsList: {
        maxHeight: 200,
    },
    tripItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    tripIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#FEF3C7",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    tripEmoji: {
        fontSize: 18,
    },
    tripInfo: {
        flex: 1,
        marginLeft: 12,
    },
    tripName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#111827",
    },
    tripLocation: {
        fontSize: 14,
        color: "#6B7280",
    },
});
