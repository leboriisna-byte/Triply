import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { useTravelGuides } from "../../hooks/useTravelGuides";
import { useTrips } from "../../hooks/useTrips";
import { useAuth } from "../../hooks/useAuth";

export default function HomeScreen() {
    const { guides, loading: guidesLoading, fetchGuides } = useTravelGuides();
    const { trips, loading: tripsLoading, fetchTrips } = useTrips();
    const { user, isGuest } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchGuides(true), fetchTrips()]);
        setRefreshing(false);
    }, []);

    const handleProfilePress = () => {
        router.push("/profile");
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require("../../assets/logonobg.png")}
                        style={styles.logoImage}
                    />
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={handleProfilePress}
                    >
                        <Ionicons name="person" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Travel Guides Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Travel Guides</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.guidesScroll}
                    >
                        {guides.map((guide) => (
                            <TouchableOpacity
                                key={guide.id}
                                style={styles.guideCard}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={{ uri: guide.cover_image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400" }}
                                    style={styles.guideImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.guideOverlay} />
                                <View style={styles.guideContent}>
                                    <View style={styles.guideLocation}>
                                        <Ionicons name="location" size={12} color="#FFFFFF" />
                                        <Text style={styles.guideCity}>{guide.city}</Text>
                                    </View>
                                    <Text style={styles.guideName} numberOfLines={2}>
                                        {guide.name}
                                    </Text>
                                    <Text style={styles.guideSpots}>{guide.spot_count} spots</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* My Trips Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Trips</Text>

                    {trips.length === 0 ? (
                        // Empty State
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="airplane" size={48} color="#1991E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No trips yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Start planning your next adventure!
                            </Text>
                            <TouchableOpacity
                                style={styles.startButton}
                                onPress={() => router.push("/trip/new")}
                            >
                                <Text style={styles.startButtonText}>Start new trip</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Trip Cards
                        trips.map((trip) => (
                            <TouchableOpacity
                                key={trip.id}
                                style={styles.tripCard}
                                activeOpacity={0.8}
                                onPress={() => router.push(`/trip/${trip.id}`)}
                            >
                                <Image
                                    source={{ uri: trip.cover_image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200" }}
                                    style={styles.tripImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.tripContent}>
                                    <Text style={styles.tripName}>{trip.name}</Text>
                                    <Text style={styles.tripMeta}>
                                        {trip.duration_days} days • {trip.destination}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        position: "relative",
    },
    logoImage: {
        width: 360,
        height: 120,
        resizeMode: "contain",
    },
    profileButton: {
        position: "absolute",
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    guidesScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    guideCard: {
        marginRight: 16,
        width: 176,
        height: 224,
        borderRadius: 16,
        overflow: "hidden",
    },
    guideImage: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
    guideOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    guideContent: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
    },
    guideLocation: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    guideCity: {
        color: "#FFFFFF",
        fontSize: 12,
        marginLeft: 4,
    },
    guideName: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 14,
    },
    guideSpots: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 12,
        marginTop: 4,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyIcon: {
        width: 128,
        height: 128,
        backgroundColor: "#DBEAFE",
        borderRadius: 64,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        color: "#4B5563",
        fontSize: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        marginBottom: 24,
    },
    startButton: {
        backgroundColor: "#000000",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    startButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    tripCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tripImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    tripContent: {
        flex: 1,
        marginLeft: 16,
    },
    tripName: {
        color: "#3B82F6",
        fontWeight: "600",
        fontSize: 16,
    },
    tripMeta: {
        color: "#6B7280",
        fontSize: 14,
        marginTop: 4,
    },
});
