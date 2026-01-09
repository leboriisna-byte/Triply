import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function TripPlannerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Trip Planner</Text>
                <Text style={styles.subtitle}>Planning trip: {id}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
    },
    subtitle: {
        color: "#6B7280",
        textAlign: "center",
    },
});
