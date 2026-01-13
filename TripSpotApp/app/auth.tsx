import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../hooks/useAuth";
import { AnimatedEntry } from "../components/ui/AnimatedEntry";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";

export default function AuthScreen() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const { signIn, signUp, setGuestMode } = useAuth();

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password, name);
                try {
                    await signIn(email, password);
                    router.replace("/(tabs)");
                } catch {
                    Alert.alert(
                        "Account Created",
                        "Your account was created. Please sign in."
                    );
                    setIsSignUp(false);
                }
            } else {
                await signIn(email, password);
                router.replace("/(tabs)");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestMode = () => {
        setGuestMode(true);
        router.replace("/(tabs)");
    };

    return (
        <LinearGradient colors={["#E9FBF4", "#FFFFFF"]} style={styles.gradient}>
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    {/* Logo - First to enter */}
                    <AnimatedEntry index={0} direction="down">
                        <View style={styles.logoContainer}>
                            <Image
                                source={require("../assets/logonobg.png")}
                                style={styles.logoImage}
                            />
                            <Text style={styles.tagline}>Plan your perfect adventure</Text>
                        </View>
                    </AnimatedEntry>

                    {/* Form - Enters slightly later */}
                    <View style={styles.form}>
                        {isSignUp && (
                            <AnimatedEntry index={1} direction="left">
                                <View style={styles.inputContainer}>
                                    <Ionicons
                                        name="person-outline"
                                        size={20}
                                        color="#6B7280"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Your name"
                                        placeholderTextColor="#9CA3AF"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </AnimatedEntry>
                        )}

                        <AnimatedEntry index={2} direction="left" delay={50}>
                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color="#6B7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email address"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </AnimatedEntry>

                        <AnimatedEntry index={3} direction="left" delay={100}>
                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color="#6B7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </AnimatedEntry>

                        <AnimatedEntry index={4} direction="up" delay={150}>
                            <AnimatedPressable
                                style={styles.submitButton}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {isSignUp ? "Create Account" : "Sign In"}
                                    </Text>
                                )}
                            </AnimatedPressable>
                        </AnimatedEntry>

                        <AnimatedEntry index={5} direction="up">
                            <AnimatedPressable
                                style={styles.switchButton}
                                onPress={() => setIsSignUp(!isSignUp)}
                            >
                                <Text style={styles.switchButtonText}>
                                    {isSignUp
                                        ? "Already have an account? Sign In"
                                        : "Don't have an account? Sign Up"}
                                </Text>
                            </AnimatedPressable>
                        </AnimatedEntry>
                    </View>

                    {/* Divider */}
                    <AnimatedEntry index={6} direction="up">
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>
                    </AnimatedEntry>

                    {/* Guest Mode */}
                    <AnimatedEntry index={7} direction="up">
                        <AnimatedPressable style={styles.guestButton} onPress={handleGuestMode}>
                            <Ionicons name="person-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                            <Text style={styles.guestButtonText}>Continue as Guest</Text>
                        </AnimatedPressable>

                        <Text style={styles.guestNote}>
                            Guest mode lets you explore the app. Sign in later to save your data.
                        </Text>
                    </AnimatedEntry>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "center",
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 48,
    },
    logoImage: {
        width: 600,
        height: 240,
        resizeMode: "contain",
    },
    tagline: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    submitButton: {
        backgroundColor: "#000000",
        borderRadius: 12,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    switchButton: {
        alignItems: "center",
        paddingVertical: 8,
    },
    switchButtonText: {
        color: "#3ED598",
        fontSize: 14,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#E5E7EB",
    },
    dividerText: {
        marginHorizontal: 16,
        color: "#9CA3AF",
        fontSize: 14,
    },
    guestButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        height: 56,
        backgroundColor: "#FFFFFF",
    },
    guestButtonText: {
        color: "#374151",
        fontSize: 16,
        fontWeight: "500",
    },
    guestNote: {
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 12,
        marginTop: 12,
        paddingHorizontal: 20,
    },
});
