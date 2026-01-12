import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Spot } from "../../lib/types";

// Category display config
const categoryConfig: Record<string, { icon: string; label: string; color: string }> = {
    cafe: { icon: "☕", label: "Cafe", color: "#8B4513" },
    restaurant: { icon: "🍕", label: "Restaurant", color: "#E74C3C" },
    attraction: { icon: "🎭", label: "Attraction", color: "#9B59B6" },
    hotel: { icon: "🏨", label: "Hotel", color: "#3498DB" },
    bar: { icon: "🍸", label: "Bar", color: "#E67E22" },
    other: { icon: "📍", label: "Place", color: "#2ECC71" },
};

// Platform badge config
const platformConfig: Record<string, { icon: string; label: string; color: string }> = {
    tiktok: { icon: "logo-tiktok", label: "TikTok", color: "#000000" },
    instagram: { icon: "logo-instagram", label: "Instagram", color: "#E4405F" },
    manual: { icon: "create", label: "Manual", color: "#6B7280" },
};

export default function SpotDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [spot, setSpot] = useState<Spot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchSpot();
        }
    }, [id]);

    const fetchSpot = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from("spots")
                .select("*")
                .eq("id", id)
                .single();

            if (fetchError) throw fetchError;
            setSpot(data as Spot);
        } catch (err) {
            console.error("Error fetching spot:", err);
            setError("Failed to load spot details");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSource = () => {
        if (spot?.source_url) {
            Linking.openURL(spot.source_url);
        }
    };

    const handleOpenMaps = () => {
        if (spot) {
            const url = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
            Linking.openURL(url);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Spot",
            "Are you sure you want to delete this spot?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await supabase.from("spots").delete().eq("id", id);
                            router.back();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete spot");
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1991E1" />
                    <Text style={styles.loadingText}>Loading spot...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !spot) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{error || "Spot not found"}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const category = categoryConfig[spot.category] || categoryConfig.other;
    const platform = platformConfig[spot.source_platform] || platformConfig.manual;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Image */}
                {spot.image_url ? (
                    <Image source={{ uri: spot.image_url }} style={styles.image} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.categoryIconLarge}>{category.icon}</Text>
                    </View>
                )}

                {/* Content */}
                <View style={styles.content}>
                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: category.color + "20" }]}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={[styles.categoryLabel, { color: category.color }]}>
                            {category.label}
                        </Text>
                    </View>

                    {/* Name */}
                    <Text style={styles.name}>{spot.name}</Text>

                    {/* Location */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#6B7280" />
                        <Text style={styles.locationText}>
                            {spot.address || `${spot.country}`}
                        </Text>
                    </View>

                    {/* Rating */}
                    {spot.rating && (
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={16} color="#FBBF24" />
                            <Text style={styles.ratingText}>{spot.rating.toFixed(1)}</Text>
                            {spot.review_count && (
                                <Text style={styles.reviewCount}>
                                    ({spot.review_count} reviews)
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Description */}
                    {spot.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.description}>{spot.description}</Text>
                        </View>
                    )}

                    {/* Source */}
                    {spot.source_platform !== "manual" && spot.source_url && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Source</Text>
                            <TouchableOpacity
                                style={styles.sourceCard}
                                onPress={handleOpenSource}
                            >
                                <View
                                    style={[
                                        styles.platformBadge,
                                        { backgroundColor: platform.color },
                                    ]}
                                >
                                    <Ionicons
                                        name={platform.icon as any}
                                        size={14}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.platformLabel}>{platform.label}</Text>
                                </View>
                                <Text style={styles.sourceUrl} numberOfLines={1}>
                                    {spot.source_url}
                                </Text>
                                <Ionicons name="open-outline" size={18} color="#1991E1" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Coordinates */}
                    {(spot.lat !== 0 || spot.lng !== 0) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Coordinates</Text>
                            <Text style={styles.coordinates}>
                                {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                {spot.source_url && spot.source_platform !== "manual" && (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleOpenSource}
                    >
                        <Ionicons name={platform.icon as any} size={20} color="#111827" />
                        <Text style={styles.secondaryButtonText}>View on {platform.label}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        !spot.source_url && styles.primaryButtonFull,
                    ]}
                    onPress={handleOpenMaps}
                >
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Open in Maps</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        color: "#6B7280",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    errorButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
    },
    errorButtonText: {
        color: "#111827",
        fontWeight: "600",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    scrollView: {
        flex: 1,
    },
    image: {
        width: "100%",
        height: 250,
        backgroundColor: "#E5E7EB",
    },
    imagePlaceholder: {
        width: "100%",
        height: 200,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    categoryIconLarge: {
        fontSize: 64,
    },
    content: {
        padding: 20,
    },
    categoryBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 12,
    },
    categoryIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: "600",
    },
    name: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    locationText: {
        marginLeft: 6,
        fontSize: 14,
        color: "#6B7280",
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    reviewCount: {
        marginLeft: 4,
        fontSize: 14,
        color: "#6B7280",
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        color: "#4B5563",
        lineHeight: 22,
    },
    sourceCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 12,
    },
    platformBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 10,
    },
    platformLabel: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "600",
        marginLeft: 4,
    },
    sourceUrl: {
        flex: 1,
        fontSize: 12,
        color: "#6B7280",
    },
    coordinates: {
        fontSize: 14,
        color: "#6B7280",
        fontFamily: "monospace",
    },
    actionButtons: {
        flexDirection: "row",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        gap: 8,
    },
    secondaryButtonText: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "600",
    },
    primaryButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        backgroundColor: "#000000",
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonFull: {
        flex: 2,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
});
