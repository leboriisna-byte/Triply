import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTrips } from "../../hooks/useTrips";
import { useAuth } from "../../hooks/useAuth";

export default function NewTripScreen() {
    const [name, setName] = useState("");
    const [destination, setDestination] = useState("");
    const [duration, setDuration] = useState("3");
    const [loading, setLoading] = useState(false);
    const { createTrip } = useTrips();
    const { user, isGuest } = useAuth();

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a trip name");
            return;
        }
        if (!destination.trim()) {
            Alert.alert("Error", "Please enter a destination");
            return;
        }
        if (isGuest || !user) {
            Alert.alert(
                "Sign in required",
                "Please sign in to create trips",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign In", onPress: () => router.push("/auth") },
                ]
            );
            return;
        }

        setLoading(true);
        try {
            const trip = await createTrip({
                user_id: user.id,
                name: name.trim(),
                destination: destination.trim(),
                duration_days: parseInt(duration) || 3,
            });
            router.replace(`/trip/${trip.id}`);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="close" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Trip</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Trip Name */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Trip Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Summer in Paris"
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {/* Destination */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Destination</Text>
                        <View style={styles.inputWithIcon}>
                            <Ionicons name="location-outline" size={20} color="#6B7280" />
                            <TextInput
                                style={styles.inputInner}
                                placeholder="Where are you going?"
                                placeholderTextColor="#9CA3AF"
                                value={destination}
                                onChangeText={setDestination}
                            />
                        </View>
                    </View>

                    {/* Duration */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Trip Duration (days)</Text>
                        <View style={styles.durationPicker}>
                            {["1", "3", "5", "7", "14"].map((days) => (
                                <TouchableOpacity
                                    key={days}
                                    style={[
                                        styles.durationOption,
                                        duration === days && styles.durationOptionSelected,
                                    ]}
                                    onPress={() => setDuration(days)}
                                >
                                    <Text
                                        style={[
                                            styles.durationText,
                                            duration === days && styles.durationTextSelected,
                                        ]}
                                    >
                                        {days}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#3B82F6" />
                        <Text style={styles.infoText}>
                            After creating your trip, you can add spots from your saved locations
                            or import new ones from TikTok and Instagram.
                        </Text>
                    </View>
                </ScrollView>

                {/* Create Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Trip</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    field: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#111827",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    inputWithIcon: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 12,
    },
    inputInner: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    durationPicker: {
        flexDirection: "row",
        gap: 12,
    },
    durationOption: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    durationOptionSelected: {
        backgroundColor: "#000000",
        borderColor: "#000000",
    },
    durationText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    durationTextSelected: {
        color: "#FFFFFF",
    },
    infoCard: {
        flexDirection: "row",
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginTop: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: "#3B82F6",
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    createButton: {
        backgroundColor: "#000000",
        borderRadius: 12,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    createButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
