import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function RootLayout() {
    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="import"
                    options={{
                        presentation: "modal",
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="spot/[id]"
                    options={{
                        presentation: "modal",
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="trip/[id]"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="trip/new"
                    options={{
                        presentation: "modal",
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="profile"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>
        </View>
    );
}
