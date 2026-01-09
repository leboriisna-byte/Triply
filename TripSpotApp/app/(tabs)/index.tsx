import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Mock data for travel guides
const travelGuides = [
    {
        id: "1",
        city: "Paris",
        country: "France",
        name: "Hidden Gems of Paris",
        spotCount: 12,
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
    },
    {
        id: "2",
        city: "Tokyo",
        country: "Japan",
        name: "Best Cafes in Tokyo",
        spotCount: 8,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
    },
    {
        id: "3",
        city: "Barcelona",
        country: "Spain",
        name: "Barcelona Food Tour",
        spotCount: 15,
        image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400",
    },
];

// Mock data for user trips
const myTrips: any[] = [];

export default function HomeScreen() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logo}>
                            Trip<Text style={styles.logoAccent}>Spot</Text>
                        </Text>
                        <View style={styles.logoUnderline} />
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => router.push("/profile")}
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
                        {travelGuides.map((guide) => (
                            <TouchableOpacity
                                key={guide.id}
                                style={styles.guideCard}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={{ uri: guide.image }}
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
                                    <Text style={styles.guideSpots}>{guide.spotCount} spots</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* My Trips Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Trips</Text>

                    {myTrips.length === 0 ? (
                        // Empty State
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="airplane" size={48} color="#1991E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No trips yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Start planning your next adventure!
                            </Text>
                            <TouchableOpacity style={styles.startButton}>
                                <Text style={styles.startButtonText}>Start new trip</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Trip Cards
                        myTrips.map((trip) => (
                            <TouchableOpacity
                                key={trip.id}
                                style={styles.tripCard}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={{ uri: trip.image }}
                                    style={styles.tripImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.tripContent}>
                                    <Text style={styles.tripName}>{trip.name}</Text>
                                    <Text style={styles.tripMeta}>
                                        {trip.duration} days • {trip.spotCount} spots
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
        justifyContent: "space-between",
        paddingVertical: 16,
    },
    logo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#111827",
    },
    logoAccent: {
        color: "#3B82F6",
    },
    logoUnderline: {
        height: 4,
        width: 64,
        backgroundColor: "#60A5FA",
        borderRadius: 2,
        marginTop: 4,
    },
    profileButton: {
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
