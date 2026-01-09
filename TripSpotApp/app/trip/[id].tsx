import { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useTrips } from "../../hooks/useTrips";
import { Database } from "../../lib/database.types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripStop = Database["public"]["Tables"]["trip_stops"]["Row"];

interface TripWithStops extends Trip {
    stops: TripStop[];
}

export default function TripPlannerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchTripWithStops, deleteTrip } = useTrips();
    const [trip, setTrip] = useState<TripWithStops | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrip();
    }, [id]);

    const loadTrip = async () => {
        if (!id) return;
        setLoading(true);
        const data = await fetchTripWithStops(id);
        setTrip(data);
        setLoading(false);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Trip",
            "Are you sure you want to delete this trip? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTrip(id!);
                            router.back();
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                        }
                    },
                },
            ]
        );
    };

    const handleShare = () => {
        if (trip?.share_token) {
            Alert.alert(
                "Share Trip",
                `Share this link with friends:\n\ntripspot://shared/${trip.share_token}`
            );
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading trip...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!trip) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Trip not found</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backLink}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {trip.name}
                </Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-outline" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Trip Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="location" size={20} color="#3B82F6" />
                        <Text style={styles.infoText}>{trip.destination}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar" size={20} color="#3B82F6" />
                        <Text style={styles.infoText}>{trip.duration_days} days</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="map" size={20} color="#3B82F6" />
                        <Text style={styles.infoText}>{trip.stops?.length || 0} stops</Text>
                    </View>
                </View>

                {/* Days */}
                {Array.from({ length: trip.duration_days }, (_, i) => i + 1).map((day) => {
                    const dayStops = trip.stops?.filter((s) => s.day_number === day) || [];
                    return (
                        <View key={day} style={styles.daySection}>
                            <View style={styles.dayHeader}>
                                <Text style={styles.dayTitle}>Day {day}</Text>
                                <TouchableOpacity style={styles.addStopButton}>
                                    <Ionicons name="add" size={20} color="#3B82F6" />
                                    <Text style={styles.addStopText}>Add Stop</Text>
                                </TouchableOpacity>
                            </View>

                            {dayStops.length === 0 ? (
                                <View style={styles.emptyDay}>
                                    <Text style={styles.emptyDayText}>No stops planned</Text>
                                </View>
                            ) : (
                                dayStops.map((stop, index) => (
                                    <View key={stop.id} style={styles.stopCard}>
                                        <View style={styles.stopNumber}>
                                            <Text style={styles.stopNumberText}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.stopInfo}>
                                            <Text style={styles.stopName}>Stop {index + 1}</Text>
                                            {stop.notes && (
                                                <Text style={styles.stopNotes}>{stop.notes}</Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    );
                })}

                {/* Delete Button */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete Trip</Text>
                </TouchableOpacity>
            </ScrollView>
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
        color: "#6B7280",
        fontSize: 16,
    },
    backLink: {
        color: "#3B82F6",
        fontSize: 16,
        marginTop: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        textAlign: "center",
        marginHorizontal: 12,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    infoCard: {
        backgroundColor: "#F0F9FF",
        borderRadius: 16,
        padding: 16,
        gap: 12,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoText: {
        fontSize: 16,
        color: "#1F2937",
    },
    daySection: {
        marginBottom: 24,
    },
    dayHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#111827",
    },
    addStopButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    addStopText: {
        color: "#3B82F6",
        fontWeight: "500",
    },
    emptyDay: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    emptyDayText: {
        color: "#9CA3AF",
    },
    stopCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    stopNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#3B82F6",
        alignItems: "center",
        justifyContent: "center",
    },
    stopNumberText: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    stopInfo: {
        flex: 1,
        marginLeft: 12,
    },
    stopName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#111827",
    },
    stopNotes: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        marginTop: 16,
        marginBottom: 32,
    },
    deleteButtonText: {
        color: "#EF4444",
        fontSize: 16,
        fontWeight: "500",
    },
});
