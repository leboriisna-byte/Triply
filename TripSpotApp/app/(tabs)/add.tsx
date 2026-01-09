import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// This is a placeholder - the actual add functionality is handled by the modal
export default function AddScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Loading...</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        color: "#6B7280",
    },
});
