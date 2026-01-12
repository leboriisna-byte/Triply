import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchTikTokData, downloadVideoAsBase64, isTikTokUrl, TikTokData } from "../lib/tiktok";
import { extractSpotsFromVideo, extractSpotsFromCaption, ExtractedSpot } from "../lib/gemini";
import { enrichSpotsWithPlaces } from "../lib/places";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";

type SpotInsert = Database['public']['Tables']['spots']['Insert'];

// Enriched spot with Google Places data
interface EnrichedSpot {
    name: string;
    category: string;
    description: string;
    lat: number;
    lng: number;
    address: string;
    country: string;
    rating?: number;
    reviewCount?: number;
    imageUrl?: string;
    placeId?: string;
}

type ImportState = "input" | "loading" | "results";

// Category icons mapping
const categoryIcons: Record<string, string> = {
    cafe: "☕",
    restaurant: "🍕",
    attraction: "🎭",
    hotel: "🏨",
    bar: "🍸",
    other: "📍",
};

// Floating icons for loading animation
const floatingIcons = ["☕", "🏨", "🖼️", "🍕", "🎭", "🍸"];

export default function ImportScreen() {
    const [state, setState] = useState<ImportState>("input");
    const [url, setUrl] = useState("");
    const [tiktokData, setTiktokData] = useState<TikTokData | null>(null);
    const [enrichedSpots, setEnrichedSpots] = useState<EnrichedSpot[]>([]);
    const [selectedSpots, setSelectedSpots] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("Fetching video...");

    // Animation values for floating icons
    const floatAnims = useRef(
        floatingIcons.map(() => new Animated.Value(0))
    ).current;

    useEffect(() => {
        if (state === "loading") {
            // Start floating animations
            floatAnims.forEach((anim, index) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 1500 + index * 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 1500 + index * 200,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            });
        }
    }, [state]);

    const handleImport = async () => {
        if (!url.trim()) {
            setError("Please paste a TikTok link");
            return;
        }

        if (!isTikTokUrl(url)) {
            setError("Please paste a valid TikTok video link");
            return;
        }

        setError(null);
        setState("loading");

        try {
            // Step 1: Fetch TikTok data
            setLoadingMessage("Fetching video data...");
            const data = await fetchTikTokData(url);
            setTiktokData(data);

            // Step 2: Download video for analysis
            setLoadingMessage("Downloading video...");
            let videoBase64: string | null = null;
            try {
                videoBase64 = await downloadVideoAsBase64(data.playUrl);
            } catch (downloadError) {
                console.log("Video download failed, falling back to caption-only analysis");
            }

            // Step 3: Extract spots using AI
            setLoadingMessage("Detecting travel spots...");
            let spots: ExtractedSpot[];

            if (videoBase64) {
                // Full video analysis
                spots = await extractSpotsFromVideo(videoBase64, data.title);
            } else {
                // Caption-only fallback
                spots = await extractSpotsFromCaption(data.title);
            }

            if (spots.length === 0) {
                // If video analysis found nothing, try caption as backup
                if (videoBase64) {
                    const captionSpots = await extractSpotsFromCaption(data.title);
                    spots = captionSpots;
                }
            }

            if (spots.length === 0) {
                Alert.alert(
                    "No Spots Found",
                    "We couldn't identify any specific locations in this video. Try a different travel video.",
                    [{ text: "OK", onPress: () => setState("input") }]
                );
                return;
            }

            // Step 4: Enrich spots with Google Places data
            setLoadingMessage("Getting location details...");
            const enriched = await enrichSpotsWithPlaces(spots);

            setEnrichedSpots(enriched);
            // Select all spots by default
            setSelectedSpots(new Set(enriched.map((_, index) => index)));
            setState("results");
        } catch (err) {
            console.error("Import error:", err);
            setError(err instanceof Error ? err.message : "Failed to import video");
            setState("input");
        }
    };

    const toggleSpotSelection = (index: number) => {
        const newSelected = new Set(selectedSpots);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedSpots(newSelected);
    };

    const handleSaveSpots = async () => {
        if (selectedSpots.size === 0) {
            Alert.alert("No Spots Selected", "Please select at least one spot to save.");
            return;
        }

        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                Alert.alert("Not Logged In", "Please log in to save spots.");
                return;
            }

            const spotsToSave: SpotInsert[] = enrichedSpots
                .filter((_: EnrichedSpot, index: number) => selectedSpots.has(index))
                .map((spot: EnrichedSpot): SpotInsert => ({
                    user_id: userData.user.id,
                    name: spot.name,
                    lat: spot.lat,
                    lng: spot.lng,
                    address: spot.address || null,
                    country: spot.country,
                    category: spot.category as any,
                    description: spot.description,
                    image_url: spot.imageUrl || tiktokData?.cover || null,
                    rating: spot.rating || null,
                    review_count: spot.reviewCount || null,
                    source_url: url,
                    source_platform: "tiktok",
                }));

            const { error: insertError } = await supabase
                .from("spots")
                .insert(spotsToSave as any);

            if (insertError) {
                throw insertError;
            }

            Alert.alert(
                "Spots Saved! 🎉",
                `Successfully saved ${spotsToSave.length} spot${spotsToSave.length > 1 ? "s" : ""} to your collection.`,
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (err) {
            console.error("Save error:", err);
            Alert.alert("Save Failed", "Failed to save spots. Please try again.");
        }
    };

    const handleBack = () => {
        if (state === "results") {
            setState("input");
            setTiktokData(null);
            setEnrichedSpots([]);
            setSelectedSpots(new Set());
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {state === "results" ? "Detected Spots" : "Import from TikTok"}
                </Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* State 1: Input */}
            {state === "input" && (
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="link"
                            size={20}
                            color="#9CA3AF"
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Paste TikTok link"
                            placeholderTextColor="#9CA3AF"
                            value={url}
                            onChangeText={(text) => {
                                setUrl(text);
                                setError(null);
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {url.length > 0 && (
                            <TouchableOpacity onPress={() => setUrl("")}>
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={styles.importButton}
                        onPress={handleImport}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.importButtonText}>Import</Text>
                    </TouchableOpacity>

                    <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionsTitle}>How it works</Text>
                        <View style={styles.instructionItem}>
                            <Text style={styles.instructionNumber}>1</Text>
                            <Text style={styles.instructionText}>
                                Copy a TikTok travel video URL
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Text style={styles.instructionNumber}>2</Text>
                            <Text style={styles.instructionText}>
                                Paste it above and tap Import
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Text style={styles.instructionNumber}>3</Text>
                            <Text style={styles.instructionText}>
                                AI will detect all places from the video
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Text style={styles.instructionNumber}>4</Text>
                            <Text style={styles.instructionText}>
                                Save the spots you like to your collection
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* State 2: Loading */}
            {state === "loading" && (
                <View style={styles.loadingContainer}>
                    <View style={styles.floatingIconsContainer}>
                        {floatingIcons.map((icon, index) => (
                            <Animated.Text
                                key={index}
                                style={[
                                    styles.floatingIcon,
                                    {
                                        transform: [
                                            {
                                                translateY: floatAnims[index].interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, -20],
                                                }),
                                            },
                                        ],
                                        opacity: floatAnims[index].interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [0.5, 1, 0.5],
                                        }),
                                    },
                                ]}
                            >
                                {icon}
                            </Animated.Text>
                        ))}
                    </View>
                    <Text style={styles.loadingTitle}>Detecting...</Text>
                    <Text style={styles.loadingSubtitle}>{loadingMessage}</Text>
                    <ActivityIndicator
                        size="large"
                        color="#1991E1"
                        style={styles.loadingSpinner}
                    />
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setState("input")}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* State 3: Results */}
            {state === "results" && tiktokData && (
                <View style={styles.resultsContainer}>
                    {/* Video Info Card */}
                    <View style={styles.videoCard}>
                        <Image
                            source={{ uri: tiktokData.cover }}
                            style={styles.videoThumbnail}
                        />
                        <View style={styles.videoInfo}>
                            <View style={styles.tiktokBadge}>
                                <Ionicons name="logo-tiktok" size={12} color="#FFFFFF" />
                                <Text style={styles.tiktokBadgeText}>TikTok</Text>
                            </View>
                            <Text style={styles.videoTitle} numberOfLines={2}>
                                {tiktokData.title || "TikTok Video"}
                            </Text>
                            <Text style={styles.videoAuthor}>@{tiktokData.author.uniqueId}</Text>
                        </View>
                    </View>

                    {/* Spots List */}
                    <Text style={styles.spotsHeader}>
                        Found {enrichedSpots.length} spot{enrichedSpots.length !== 1 ? "s" : ""}
                    </Text>
                    <ScrollView style={styles.spotsList}>
                        {enrichedSpots.map((spot, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.spotItem,
                                    selectedSpots.has(index) && styles.spotItemSelected,
                                ]}
                                onPress={() => toggleSpotSelection(index)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.spotCheckbox}>
                                    {selectedSpots.has(index) ? (
                                        <Ionicons name="checkbox" size={24} color="#1991E1" />
                                    ) : (
                                        <Ionicons
                                            name="square-outline"
                                            size={24}
                                            color="#9CA3AF"
                                        />
                                    )}
                                </View>
                                <Text style={styles.spotNumber}>{index + 1}</Text>
                                <Text style={styles.spotIcon}>
                                    {categoryIcons[spot.category] || "📍"}
                                </Text>
                                <View style={styles.spotDetails}>
                                    <Text style={styles.spotName}>{spot.name}</Text>
                                    <Text style={styles.spotDescription} numberOfLines={1}>
                                        {spot.description}
                                    </Text>
                                    {(spot.address || spot.country) && (
                                        <Text style={styles.spotLocation}>
                                            📍 {spot.address || spot.country}
                                        </Text>
                                    )}
                                    {spot.rating && (
                                        <Text style={styles.spotRating}>
                                            ⭐ {spot.rating.toFixed(1)}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Save Button */}
                    <View style={styles.saveButtonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                selectedSpots.size === 0 && styles.saveButtonDisabled,
                            ]}
                            onPress={handleSaveSpots}
                            disabled={selectedSpots.size === 0}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>
                                Save {selectedSpots.size} spot{selectedSpots.size !== 1 ? "s" : ""}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    headerPlaceholder: {
        width: 40,
    },
    // Input State
    inputContainer: {
        flex: 1,
        padding: 20,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 14,
        marginTop: 8,
        marginLeft: 4,
    },
    importButton: {
        backgroundColor: "#000000",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 16,
    },
    importButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    instructionsContainer: {
        marginTop: 40,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 16,
    },
    instructionItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#E8F4FC",
        color: "#1991E1",
        textAlign: "center",
        lineHeight: 24,
        fontSize: 12,
        fontWeight: "600",
        marginRight: 12,
    },
    instructionText: {
        fontSize: 14,
        color: "#6B7280",
        flex: 1,
    },
    // Loading State
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    floatingIconsContainer: {
        flexDirection: "row",
        marginBottom: 30,
    },
    floatingIcon: {
        fontSize: 32,
        marginHorizontal: 8,
    },
    loadingTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 20,
    },
    loadingSpinner: {
        marginBottom: 30,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelButtonText: {
        color: "#6B7280",
        fontSize: 14,
    },
    // Results State
    resultsContainer: {
        flex: 1,
    },
    videoCard: {
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    videoThumbnail: {
        width: 80,
        height: 100,
        borderRadius: 8,
        backgroundColor: "#E5E7EB",
    },
    videoInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    tiktokBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#000000",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: "flex-start",
        marginBottom: 8,
    },
    tiktokBadgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "600",
        marginLeft: 4,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#111827",
        marginBottom: 4,
    },
    videoAuthor: {
        fontSize: 12,
        color: "#6B7280",
    },
    spotsHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    spotsList: {
        flex: 1,
    },
    spotItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    spotItemSelected: {
        backgroundColor: "#F0F9FF",
    },
    spotCheckbox: {
        marginRight: 8,
    },
    spotNumber: {
        width: 20,
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF",
        textAlign: "center",
    },
    spotIcon: {
        fontSize: 20,
        marginHorizontal: 10,
    },
    spotDetails: {
        flex: 1,
    },
    spotName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    spotDescription: {
        fontSize: 13,
        color: "#6B7280",
    },
    spotLocation: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    spotRating: {
        fontSize: 12,
        color: "#FBBF24",
        marginTop: 2,
    },
    saveButtonContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        backgroundColor: "#FFFFFF",
    },
    saveButton: {
        backgroundColor: "#000000",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    saveButtonDisabled: {
        backgroundColor: "#D1D5DB",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
