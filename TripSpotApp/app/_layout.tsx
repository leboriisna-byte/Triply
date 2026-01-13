import { useEffect } from "react";
import { Slot, router, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../hooks/useAuth";

function InitialLayout() {
    const { user, loading, isGuest } = useAuth();
    const segments = useSegments();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        // Wait for navigation to be ready
        if (!navigationState?.key) return;
        if (loading) return;

        const inAuthGroup = segments[0] === "auth";
        const isAuthenticated = user || isGuest;

        if (!isAuthenticated && !inAuthGroup) {
            // Not logged in and not on auth screen - redirect to auth
            router.replace("/auth");
        } else if (isAuthenticated && inAuthGroup) {
            // Logged in but on auth screen - redirect to home
            router.replace("/(tabs)");
        }
    }, [user, isGuest, segments, navigationState?.key, loading]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E9FBF4" }}>
                <ActivityIndicator size="large" color="#3ED598" />
            </View>
        );
    }

    return <Slot />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <View style={{ flex: 1 }}>
                <StatusBar style="dark" />
                <InitialLayout />
            </View>
        </AuthProvider>
    );
}
