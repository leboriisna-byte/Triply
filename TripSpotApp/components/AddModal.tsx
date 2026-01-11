import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

interface AddModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function AddModal({ visible, onClose }: AddModalProps) {
    const translateY = useRef(new Animated.Value(300)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 300,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleNewTrip = () => {
        handleClose();
        setTimeout(() => router.push("/trip/new"), 300);
    };

    const handleFindTrip = () => {
        handleClose();
        setTimeout(() => router.push("/trip/new"), 300);
    };

    const handleAddSpots = () => {
        handleClose();
        setTimeout(() => router.push("/import"), 300);
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.overlay, { opacity }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View style={[styles.content, { transform: [{ translateY }] }]}>
                            {/* New Trip Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, styles.newTripButton]}
                                onPress={handleNewTrip}
                                activeOpacity={0.9}
                            >
                                <View style={styles.buttonContent}>
                                    <View style={styles.buttonTextContainer}>
                                        <Text style={styles.newTripText}>New trip</Text>
                                        <Text style={styles.buttonSubtext}>
                                            Plan your next adventure
                                        </Text>
                                    </View>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="airplane" size={28} color="#FFFFFF" />
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Find Trip Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, styles.findTripButton]}
                                onPress={handleFindTrip}
                                activeOpacity={0.9}
                            >
                                <View style={styles.buttonContent}>
                                    <View style={styles.buttonTextContainer}>
                                        <Text style={styles.findTripText}>Find trip</Text>
                                        <Text style={[styles.buttonSubtext, { color: "#6B7280" }]}>
                                            Discover curated guides
                                        </Text>
                                    </View>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="search" size={28} color="#1991E1" />
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Add Spots Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, styles.addSpotsButton]}
                                onPress={handleAddSpots}
                                activeOpacity={0.9}
                            >
                                <View style={styles.buttonContent}>
                                    <View style={styles.buttonTextContainer}>
                                        <Text style={styles.addSpotsText}>Add spots</Text>
                                        <Text style={[styles.buttonSubtext, { color: "#6B7280" }]}>
                                            Import from TikTok or Instagram
                                        </Text>
                                    </View>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="location" size={28} color="#EF4444" />
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Close Button */}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 40,
    },
    content: {
        width: "90%",
        maxWidth: 400,
        alignItems: "center",
    },
    actionButton: {
        width: "100%",
        height: 100,
        borderRadius: 20,
        marginBottom: 12,
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    newTripButton: {
        backgroundColor: "#000000",
    },
    findTripButton: {
        backgroundColor: "#E8F4FC",
    },
    addSpotsButton: {
        backgroundColor: "#FFFFFF",
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    buttonTextContainer: {
        flex: 1,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    newTripText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700",
    },
    findTripText: {
        color: "#1991E1",
        fontSize: 20,
        fontWeight: "700",
    },
    addSpotsText: {
        color: "#1F2937",
        fontSize: 20,
        fontWeight: "700",
    },
    buttonSubtext: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 14,
        marginTop: 4,
    },
    closeButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
