import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import AddModal from "../../components/AddModal";

export default function TabLayout() {
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    return (
        <LinearGradient
            colors={["#E8F4FC", "#FFFFFF"]}
            style={{ flex: 1 }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarShowLabel: false,
                    tabBarStyle: styles.tabBar,
                    tabBarActiveTintColor: "#1991E1",
                    tabBarInactiveTintColor: "#9CA3AF",
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="briefcase-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="add"
                    options={{
                        tabBarButton: () => (
                            <TouchableOpacity
                                style={styles.fabContainer}
                                onPress={() => setIsAddModalVisible(true)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.fab}>
                                    <Ionicons name="add" size={32} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        ),
                    }}
                    listeners={{
                        tabPress: (e) => {
                            e.preventDefault();
                            setIsAddModalVisible(true);
                        },
                    }}
                />
                <Tabs.Screen
                    name="map"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="map-outline" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>

            <AddModal
                visible={isAddModalVisible}
                onClose={() => setIsAddModalVisible(false)}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 30,
        height: 65,
        paddingBottom: 0,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderTopWidth: 0,
    },
    fabContainer: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        top: -15,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
});
