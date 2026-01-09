import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MapScreen() {
    return (
        <View style={styles.container}>
            {/* Map Container */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                        latitude: 48.8566,
                        longitude: 2.3522,
                        latitudeDelta: 30,
                        longitudeDelta: 30,
                    }}
                    showsUserLocation
                    showsMyLocationButton={false}
                />
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <SafeAreaView edges={["bottom"]}>
                    <View style={styles.sheetContent}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>My Spots</Text>
                                <Text style={styles.sheetSubtitle}>0 Spots Saved</Text>
                            </View>
                            <TouchableOpacity style={styles.importButton}>
                                <Text style={styles.importButtonText}>Import Guides</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Empty State */}
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="location-outline" size={32} color="#1991E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No spots saved yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Import spots from TikTok or Instagram
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        height: SCREEN_HEIGHT * 0.55,
    },
    map: {
        flex: 1,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: "#D1D5DB",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
    },
    sheetSubtitle: {
        color: "#6B7280",
        fontSize: 14,
    },
    importButton: {
        backgroundColor: "#000000",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    importButtonText: {
        color: "#FFFFFF",
        fontWeight: "500",
        fontSize: 14,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        backgroundColor: "#DBEAFE",
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        color: "#4B5563",
        fontSize: 16,
    },
    emptySubtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        marginTop: 4,
    },
});
