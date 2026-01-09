import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useSpots } from "../hooks/useSpots";
import { useTrips } from "../hooks/useTrips";

export default function ProfileScreen() {
    const { user, isGuest, signOut, loading } = useAuth();
    const { spots } = useSpots();
    const { trips } = useTrips();

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace("/auth");
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                        }
                    },
                },
            ]
        );
    };

    const handleSignIn = () => {
        router.push("/auth");
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Profile Content */}
            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    {user?.user_metadata?.avatar_url ? (
                        <Image
                            source={{ uri: user.user_metadata.avatar_url }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Ionicons name="person" size={40} color="#6B7280" />
                    )}
                </View>

                {/* Name */}
                <Text style={styles.name}>
                    {isGuest ? "Guest User" : user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
                </Text>
                <Text style={styles.subtitle}>
                    {isGuest ? "Sign in to save your trips" : user?.email}
                </Text>

                {/* Stats */}
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{spots.length}</Text>
                        <Text style={styles.statLabel}>Spots</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{trips.length}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                </View>

                {/* Action Button */}
                {isGuest || !user ? (
                    <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        disabled={loading}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Menu Items */}
            <View style={styles.menu}>
                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="heart-outline" size={24} color="#6B7280" />
                    <Text style={styles.menuItemText}>Saved Spots</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="settings-outline" size={24} color="#6B7280" />
                    <Text style={styles.menuItemText}>Settings</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
                    <Text style={styles.menuItemText}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
        alignItems: "center",
        paddingTop: 32,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        overflow: "hidden",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    name: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 4,
    },
    subtitle: {
        color: "#6B7280",
        fontSize: 14,
        marginBottom: 24,
    },
    stats: {
        flexDirection: "row",
        gap: 48,
        marginBottom: 24,
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
    },
    statLabel: {
        color: "#6B7280",
        fontSize: 14,
    },
    signInButton: {
        backgroundColor: "#000000",
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
    },
    signInText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    signOutButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#FEE2E2",
        backgroundColor: "#FEF2F2",
    },
    signOutText: {
        color: "#EF4444",
        fontWeight: "600",
    },
    menu: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    menuItemText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: "#374151",
    },
});
