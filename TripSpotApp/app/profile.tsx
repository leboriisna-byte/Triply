import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ProfileScreen() {
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
                    <Ionicons name="person" size={40} color="#6B7280" />
                </View>

                {/* Name */}
                <Text style={styles.name}>Guest User</Text>
                <Text style={styles.subtitle}>Sign in to save your trips</Text>

                {/* Stats */}
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Spots</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity style={styles.signInButton}>
                    <Text style={styles.signInText}>Sign In</Text>
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
        flex: 1,
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
        gap: 32,
        marginBottom: 32,
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
});
