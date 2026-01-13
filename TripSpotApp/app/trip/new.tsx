import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withSpring,
    interpolate,
    interpolateColor,
    withRepeat,
    withSequence,
    withTiming,
    runOnJS,
    Easing,
    Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    FlatList,
    Animated,
    Dimensions,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { countries, tripCategories } from '../../lib/tripData';
import { generateFullTripWithFallback as generateFullTrip, GeneratedSpot, TripPreferences, DayPlan } from '../../lib/gemini';
import { searchPlacesAutocomplete, getPlaceDetails, PlacePrediction } from '../../lib/places';
import { useAuth } from '../../hooks/useAuth';
import { useTrips } from '../../hooks/useTrips';
import { SwipeableCard, SwipeableCardRef } from '../../components/SwipeableCard';

const AnimatedLinearGradient = Reanimated.createAnimatedComponent(LinearGradient);
const AnimatedBlurView = Reanimated.createAnimatedComponent(BlurView);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type WizardStep = 'destination' | 'mode-selection' | 'preferences' | 'duration' | 'discover' | 'swipe';

interface SelectedDestination {
    name: string;
    country: string;
    flag: string;
}

// --- DESIGN SYSTEM (iOS Standard) ---
const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
};

const COLORS = {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    accent: '#3ED598',
    divider: '#F3F4F6',
    overlay: 'rgba(0,0,0,0.4)',
    sheetHandle: '#E5E7EB',
    inputBackground: '#F3F4F6',
};

const TYPOGRAPHY = {
    title: { fontSize: 30, fontWeight: '600', lineHeight: 34 },
    header: { fontSize: 20, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
    bodyReg: { fontSize: 17, fontWeight: '400', lineHeight: 22 },
    subhead: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 13, fontWeight: '500', lineHeight: 16 },
};

const RADIUS = {
    control: 12,
    card: 16,
    sheet: 24,
};
// -------------------------------------

const VolumetricGradient = ({ expandProgress }: { expandProgress: Reanimated.SharedValue<number> }) => {
    // 6 Layers for depth and complexity
    // Colors: Mint, Jade, Soft Emerald, Teal Shadows, Cyan Highlights
    const blob1 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // Mint Main
    const blob2 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // Jade Darker
    const blob3 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // Emerald Soft
    const blob4 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // Teal Shadow
    const blob5 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // Cyan Highlight
    const blob6 = useSharedValue({ x: 0, y: 0, scale: 1, rotate: 0 }); // White/Mint Mist

    const SCREEN_WIDTH = Dimensions.get('window').width;

    useEffect(() => {
        const config = { duration: 25000, easing: Easing.inOut(Easing.cubic) };
        const configSlow = { duration: 30000, easing: Easing.inOut(Easing.cubic) };
        const configFast = { duration: 20000, easing: Easing.inOut(Easing.cubic) };

        // Helper for random organic motion
        const drift = (sv: any, speed: number, range: number) => {
            sv.value = withRepeat(
                withSequence(
                    withTiming({
                        x: Math.random() * range - range / 2,
                        y: Math.random() * range - range / 2,
                        scale: 1 + Math.random() * 0.06, // Max 1.06 scale
                        rotate: Math.random() * 30 - 15, // Gentle rotation
                    }, { duration: speed, easing: Easing.inOut(Easing.cubic) }),
                    withTiming({
                        x: Math.random() * range - range / 2,
                        y: Math.random() * range - range / 2,
                        scale: 1 - Math.random() * 0.06,
                        rotate: Math.random() * 30 - 15,
                    }, { duration: speed * 1.2, easing: Easing.inOut(Easing.cubic) }),
                    withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, { duration: speed, easing: Easing.inOut(Easing.cubic) }) // Return to startish
                ),
                -1,
                true // Reverses
            );
        };

        // 1. Mint Main - Center Bottom
        blob1.value = withRepeat(withSequence(
            withTiming({ x: 30, y: -20, scale: 1.05, rotate: 10 }, config),
            withTiming({ x: -20, y: 10, scale: 0.95, rotate: -5 }, config),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, config)
        ), -1, true);

        // 2. Jade Darker - Bottom Left, moves diag
        blob2.value = withRepeat(withSequence(
            withTiming({ x: 50, y: -40, scale: 1.06, rotate: 20 }, configSlow),
            withTiming({ x: -10, y: 20, scale: 0.98, rotate: -10 }, configSlow),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, configSlow)
        ), -1, true);

        // 3. Emerald Soft - Bottom Right
        blob3.value = withRepeat(withSequence(
            withTiming({ x: -40, y: -30, scale: 1.04, rotate: -15 }, config),
            withTiming({ x: 20, y: 10, scale: 0.96, rotate: 10 }, config),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, config)
        ), -1, true);

        // 4. Teal Shadow - Deep background
        blob4.value = withRepeat(withSequence(
            withTiming({ x: 40, y: 30, scale: 1.02, rotate: 45 }, configSlow),
            withTiming({ x: -40, y: -10, scale: 0.9, rotate: 0 }, configSlow),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, configSlow)
        ), -1, true);

        // 5. Cyan Highlight - Top layer, sharper
        blob5.value = withRepeat(withSequence(
            withTiming({ x: -60, y: 20, scale: 1.1, rotate: -20 }, configFast),
            withTiming({ x: 40, y: -40, scale: 0.9, rotate: 20 }, configFast),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, configFast)
        ), -1, true);

        // 6. Mist
        blob6.value = withRepeat(withSequence(
            withTiming({ x: 20, y: -20, scale: 1.08, rotate: 5 }, config),
            withTiming({ x: -20, y: 20, scale: 0.92, rotate: -5 }, config),
            withTiming({ x: 0, y: 0, scale: 1, rotate: 0 }, config)
        ), -1, true);

    }, []);

    const animatedStyle = (sv: any) => useAnimatedStyle(() => ({
        transform: [
            { translateX: sv.value.x },
            { translateY: sv.value.y },
            { scale: sv.value.scale },
            { rotate: `${sv.value.rotate}deg` },
        ],
    }));

    const maskParams = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 1], [0, 1]),
    }));

    return (
        <View style={styles.volumetricContainer}>
            {/* Base Blur for the countries (Top part) - 10% */}
            <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="light" />

            <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={
                    <View style={StyleSheet.absoluteFill}>
                        <LinearGradient
                            // Top 40% is just the 10% base blur.
                            // Gradient starts fading in liquid at 40% (0.4) and is full strength by 60% (0.6).
                            colors={['transparent', 'transparent', 'black']}
                            locations={[0, 0.3, 0.6]}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Full opacity overlay controlled by expansion */}
                        <Reanimated.View
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: 'black' },
                                maskParams
                            ]}
                        />
                    </View>
                }
            >
                <View style={[styles.volumetricContainer, { backgroundColor: 'transparent' }]}>
                    {/* Background Base */}
                    <LinearGradient
                        colors={['transparent', 'rgba(62, 213, 152, 0.05)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Layer 4: Deep Teal Shadow (Furthest) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobTeal, animatedStyle(blob4)]} />

                    {/* Layer 2: Jade (Mid) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobJade, animatedStyle(blob2)]} />

                    {/* Layer 1: Mint Main (Mid-Front) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobMint, animatedStyle(blob1)]} />

                    {/* Layer 3: Emerald (Front-Side) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobEmerald, animatedStyle(blob3)]} />

                    {/* Heavy Blur to blend background layers */}
                    <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light" />

                    {/* Layer 6: Mist (Semi-transparent overlay) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobMist, animatedStyle(blob6)]} />

                    {/* Layer 5: Cyan Highlight (Sharpest, Front) */}
                    <Reanimated.View style={[styles.blobBase, styles.blobCyan, animatedStyle(blob5)]} />

                    {/* Final Soft Blur for overall cohesion */}
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />

                    {/* Gradient Mask to fade to transparent at top - Keeping this for extra smoothness inside the mask */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.1)']}
                        locations={[0, 0.5, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            </MaskedView>
        </View>
    );
};

export default function TripWizardScreen() {
    const [step, setStep] = useState<WizardStep>('destination');
    const [generationMode, setGenerationMode] = useState<'classic' | 'tinder'>('classic');
    const [swipeIndex, setSwipeIndex] = useState(0); // Track current card in Tinder mode
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const searchTimeout = useRef<any>(null);
    const cardRef = useRef<SwipeableCardRef>(null);

    const [selectedDestination, setSelectedDestination] = useState<SelectedDestination | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['popular']);
    const [tripDays, setTripDays] = useState(3);
    const [dateMode, setDateMode] = useState<'dates' | 'flexible'>('flexible');
    const scrollY = useRef(new Animated.Value(0)).current;
    const ITEM_HEIGHT = 100; // Large items for the wheel
    const VISIBLE_ITEMS = 5; // How many items visible at once
    const daysData = Array.from({ length: 14 }, (_, i) => i + 1); // 1 to 14 days
    const [spots, setSpots] = useState<GeneratedSpot[]>([]);
    const [itinerary, setItinerary] = useState<DayPlan[]>([]);
    const [selectedSpots, setSelectedSpots] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

    const expandProgress = useSharedValue(0);
    const insets = useSafeAreaInsets();

    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        expandProgress.value = withSpring(isSearchActive ? 1 : 0, {
            damping: 30,
            stiffness: 200, // Faster, snappier
            mass: 0.8,
        });
    }, [isSearchActive]);
    const { user, isGuest } = useAuth();
    const { createTrip, saveTripItinerary } = useTrips();


    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (query.trim().length > 2) {
            setIsSearching(true);
            searchTimeout.current = setTimeout(async () => {
                console.log('Searching for:', query);
                try {
                    const predictions = await searchPlacesAutocomplete(query);
                    console.log('Search results:', predictions.length);
                    setSearchResults(predictions);
                } catch (e) {
                    console.error('Search error in UI:', e);
                } finally {
                    setIsSearching(false);
                }
            }, 500);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const selectDestination = async (prediction: PlacePrediction) => {
        setSearchQuery(prediction.mainText);
        setSearchResults([]);

        let country = prediction.country || 'Unknown';

        // Only fetch details if we really need to (and it's a real Google ID)
        if (country === 'Unknown' && !prediction.placeId.startsWith('photon_') && !prediction.placeId.startsWith('hardcoded_')) {
            try {
                // Fetch full details to get country
                const details = await getPlaceDetails(prediction.placeId);
                if (details?.country) {
                    country = details.country;
                }
            } catch (e) {
                console.warn('Failed to fetch place details, proceeding with specific location:', e);
            }
        }

        const dest: SelectedDestination = {
            name: prediction.mainText,
            country: country,
            flag: '🌍', // Default flag as we don't have mapping for all places
        };

        setSelectedDestination(dest);

        // Auto-advance to mode selection
        setTimeout(() => setStep('mode-selection'), 300);
    };

    // Helper for manual selection from country list
    const selectCountryFromList = (dest: { name: string; country: string; flag: string }) => {
        setSelectedDestination(dest);
        setSearchQuery(dest.name);
        setSearchResults([]);
        setTimeout(() => setStep('mode-selection'), 300);
    };

    const handleModeSelect = (mode: 'classic' | 'tinder') => {
        setGenerationMode(mode);
        // Add a small delay for visual feedback if needed, currently direct
        setStep('preferences');
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(c => c !== categoryId);
            }
            return [...prev, categoryId];
        });
    };

    const handlePreferencesContinue = () => {
        if (selectedCategories.length === 0) {
            setSelectedCategories(['popular']);
        }
        setStep('duration');
    };

    const handleDurationConfirm = async () => {
        if (!selectedDestination) return;

        setLoading(true);
        setStep('discover');

        try {
            const preferences: TripPreferences = {
                destination: selectedDestination.name,
                country: selectedDestination.country || selectedDestination.name,
                categories: selectedCategories,
                days: tripDays,
            };

            console.log('Generating full trip plan with AI...');
            // Use AI to generate complete day-by-day trip plan
            const generatedItinerary = await generateFullTrip(preferences);
            setItinerary(generatedItinerary);

            // Extract all spots from the itinerary
            // Extract all spots from the itinerary
            const allSpots = generatedItinerary.flatMap(day => day.spots);
            setSpots(allSpots);

            if (generationMode === 'tinder') {
                // Tinder Mode: Start with empty selection, swipe to add
                setSelectedSpots(new Set());
                setSwipeIndex(0);
                setStep('swipe');
            } else {
                // Classic Mode: Select all spots by default
                setSelectedSpots(new Set(allSpots.map((_, i) => i)));
                setStep('discover');
            }

            console.log(`AI generated ${generatedItinerary.length}-day plan with ${allSpots.length} spots`);
        } catch (error) {
            console.error('Failed to generate trip plan:', error);
            Alert.alert(
                'AI Planning Failed',
                error instanceof Error ? error.message : 'Failed to generate trip plan. Please check your internet connection.',
                [
                    { text: 'Try Again', onPress: handleDurationConfirm },
                    { text: 'Cancel', onPress: () => setStep('duration'), style: 'cancel' }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleSpotSelection = (index: number) => {
        setSelectedSpots(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleCreateTrip = async (withSpots: boolean) => {
        if (!selectedDestination) {
            Alert.alert('Error', 'Please select a destination first');
            return;
        }

        if (isGuest || !user) {
            Alert.alert('Authentication Required', 'Please sign in to create a trip', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: () => router.push('/auth') }
            ]);
            return;
        }

        setLoading(true);
        console.log('Attempting to create trip with user:', user.id);

        try {
            console.log('Creating trip payload for destination:', selectedDestination.name);

            // Create the trip record first
            const trip: any = await createTrip({
                user_id: user.id,
                name: `${tripDays}-Day ${selectedDestination.name} Trip`,
                destination: selectedDestination.name,
                duration_days: tripDays,
            });

            if (!trip) throw new Error('Trip creation returned no data');

            console.log('Trip created successfully:', trip.id);

            // Save ALL spots and itinerary to database immediately
            if (withSpots && itinerary.length > 0) {
                console.log('Saving itinerary to database...');
                await saveTripItinerary(trip.id, user.id, itinerary);
                console.log('Itinerary saved with', spots.length, 'spots');
            }

            // Navigate to trip planner (data is already in DB, no need for params)
            router.replace({
                pathname: `/trip/[id]`,
                params: {
                    id: trip.id,
                },
            });
        } catch (error) {
            console.error('Failed to create trip:', error);
            Alert.alert('Creation Failed', error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const filteredSpots = activeFilter === 'All'
        ? spots
        : spots.filter(s => s.category === activeFilter.toLowerCase());

    const animatedGradientStyle = useAnimatedStyle(() => {
        const height = interpolate(
            expandProgress.value,
            [0, 1],
            [220, SCREEN_HEIGHT - 60],
            Extrapolation.CLAMP

        );
        const bottom = interpolate(
            expandProgress.value,
            [0, 1],
            [0, 0], // Always anchored to bottom, but height grows
            Extrapolation.CLAMP
        );

        return {
            height,
            bottom,
            backgroundColor: 'transparent',
        };
    });

    const animatedOverlayStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
        };
    });

    const defaultContentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
            transform: [
                { translateY: interpolate(expandProgress.value, [0, 1], [0, -50], Extrapolation.CLAMP) }
            ],
        };
    });

    const searchContentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0.3, 1], [0, 1], Extrapolation.CLAMP),
            transform: [
                { translateY: interpolate(expandProgress.value, [0.5, 1], [50, 0], Extrapolation.CLAMP) }
            ],
        };
    });



    const backgroundContentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0, 0.5], [1, 0.2], Extrapolation.CLAMP), // Fade out to 0.2 (Visible)
        };
    });

    const blurAnimatedProps = useAnimatedProps(() => {
        return {
            intensity: interpolate(expandProgress.value, [0, 1], [0, 100], Extrapolation.CLAMP),
        };
    });


    const renderDestinationStep = () => (
        <View style={styles.stepContainer}>
            {/* Full Screen List - Always rendered behind */}
            <FlatList
                data={countries}
                keyExtractor={(item) => item.code}
                contentContainerStyle={{
                    paddingTop: insets.top + SPACING.xl, // Slight top padding
                    paddingBottom: 350,
                    paddingHorizontal: SPACING.lg
                }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.countryRowDS} // Apply the larger row style directly
                        onPress={() => selectCountryFromList({ name: item.name, country: item.name, flag: item.flag })}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
                            <Text style={styles.countryFlagDS}>{item.flag}</Text>
                            <Text style={styles.countryNameDS}>{item.name}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* Volumetric Gradient Overlay */}
            <View style={styles.bottomOverlay} pointerEvents="none">
                <VolumetricGradient expandProgress={expandProgress} />
            </View>

            {/* Full Screen Blur Overlay (Animate intensity) */}
            <AnimatedBlurView
                style={StyleSheet.absoluteFill}
                animatedProps={blurAnimatedProps}
                tint="light"
            />

            {/* Dimming Overlay */}
            <Reanimated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay }, animatedOverlayStyle]}
                pointerEvents={isSearchActive ? 'auto' : 'none'}
            />




            {/* Expanding Gradient Overlay */}
            {/* Show Sheet Container */}
            <Reanimated.View
                style={[styles.sheet, animatedGradientStyle]}
                pointerEvents={isSearchActive ? 'auto' : 'box-none'}
            >
                {/* Grabber Handle */}
                <View style={styles.sheetHandleContainer}>
                    <View style={styles.sheetHandle} />
                </View>

                {/* Default Bottom Content */}
                <Reanimated.View
                    style={[styles.bottomContent, StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: 30 }, defaultContentStyle]}
                    pointerEvents={isSearchActive ? 'none' : 'auto'}
                >
                    <Text style={styles.bottomTitleNew}>Where are we going?</Text>
                    <Text style={styles.bottomSubtitleNew}>Search for your destination</Text>

                    <TouchableOpacity
                        style={styles.searchButtonNew}
                        onPress={() => setIsSearchActive(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="search" size={20} color="#000000" />
                        <Text style={styles.searchButtonTextNew}>Search</Text>
                    </TouchableOpacity>
                </Reanimated.View>

                {/* Search Content Overlay */}
                <Reanimated.View
                    style={[styles.searchResultsContainer, StyleSheet.absoluteFill, { backgroundColor: 'transparent', paddingTop: 0 }, searchContentStyle]}
                    pointerEvents={isSearchActive ? 'auto' : 'none'}
                >


                    <View style={[styles.searchHeader, { borderBottomColor: 'transparent', paddingHorizontal: 16, paddingTop: 40, zIndex: 100 }]}>
                        <TouchableOpacity
                            onPress={() => { setSearchQuery(''); setSearchResults([]); setIsSearchActive(false); }}
                            style={{ marginRight: 8 }}
                        >
                            <Ionicons name="chevron-down" size={32} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.searchField}>
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                style={[styles.searchInputInline, { color: '#000000', flex: 1, fontSize: 17 } as any]}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                placeholder="Search destinations"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="words"
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, index) => `${item.placeId}-${index}`}
                        keyboardShouldPersistTaps="always"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => selectDestination(item)}
                            >
                                <Text style={styles.resultName}>{item.mainText}</Text>
                                <Text style={styles.resultCountry}>{item.secondaryText}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            isSearching ? (
                                <ActivityIndicator style={{ marginTop: 20 }} color="#000000" />
                            ) : null
                        }
                    />
                </Reanimated.View>
            </Reanimated.View>
        </View >
    );



    const renderModeSelectionStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.preferencesContent}>
                <View style={[styles.preferencesHeaderIcon, { marginBottom: 10 }]}>
                    {/* Keep consistent header style */}
                    <Text style={{ fontSize: 40 }}>✨</Text>
                </View>
                <Text style={styles.preferencesTitle}>Choose your vibe</Text>
                <Text style={styles.preferencesSubtitle}>How do you want to build this trip?</Text>

                <View style={{ gap: 20 }}>
                    <TouchableOpacity
                        style={[styles.modeCard, generationMode === 'classic' && styles.modeCardSelected]}
                        onPress={() => handleModeSelect('classic')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.modeIconContainer, { backgroundColor: '#E9FBF4' }]}>
                            <Ionicons name="list" size={28} color="#00A86B" />
                        </View>
                        <View style={styles.modeTextContainer}>
                            <Text style={styles.modeTitle}>Classic Planner</Text>
                            <Text style={styles.modeDescription}>Customize every detail step-by-step. Perfect for control freaks.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modeCard, generationMode === 'tinder' && styles.modeCardSelected]}
                        onPress={() => handleModeSelect('tinder')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.modeIconContainer, { backgroundColor: '#FFF0F0' }]}>
                            <Ionicons name="flame" size={28} color="#FF5864" />
                        </View>
                        <View style={styles.modeTextContainer}>
                            <Text style={styles.modeTitle}>Tinder Style</Text>
                            <Text style={styles.modeDescription}>Swipe right on spots you love. Fast, fun, and spontaneous.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>
            </View>
            {/* Back Button */}
            <TouchableOpacity
                style={{ position: 'absolute', top: 60, left: 20, zIndex: 10 }}
                onPress={() => setStep('destination')}
            >
                <Ionicons name="chevron-back" size={28} color="black" />
            </TouchableOpacity>
        </View>
    );

    const renderPreferencesStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.preferencesContent}>
                <View style={styles.preferencesHeaderIcon}>
                    <Ionicons name="thumbs-up" size={32} color="#3ED598" />
                </View>
                <Text style={styles.preferencesTitle}>Trip Preferences</Text>
                <Text style={styles.preferencesSubtitle}>What should your trip be about?</Text>

                <View style={styles.categoriesGrid}>
                    {tripCategories.map(category => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryChip,
                                selectedCategories.includes(category.id) && styles.categoryChipSelected,
                            ]}
                            onPress={() => toggleCategory(category.id)}
                        >
                            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                            <Text style={[
                                styles.categoryName,
                                selectedCategories.includes(category.id) && styles.categoryNameSelected,
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.durationPreview}>
                    <Ionicons name="calendar" size={24} color="#9CA3AF" />
                    <Text style={styles.durationPreviewText}>Trip Duration</Text>
                </View>
            </View>

            <View style={styles.bottomButton}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handlePreferencesContinue}
                >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderDurationStep = () => {
        return (
            <View style={styles.stepContainer}>
                {/* Header */}
                <View style={[styles.durationHeader, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => setStep('preferences')} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#000000" />
                    </TouchableOpacity>

                    {/* Date/Flexible Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, dateMode === 'dates' && styles.toggleButtonActive]}
                            onPress={() => setDateMode('dates')}
                        >
                            <Text style={[styles.toggleText, dateMode === 'dates' && styles.toggleTextActive]}>Dates</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, dateMode === 'flexible' && styles.toggleButtonActive]}
                            onPress={() => setDateMode('flexible')}
                        >
                            <Text style={[styles.toggleText, dateMode === 'flexible' && styles.toggleTextActive]}>Flexible</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.durationTitleMain}>How many days?</Text>

                {/* Wheel Picker */}
                <View style={styles.wheelPickerContainer}>
                    {/* Selection Indicator (Background) */}
                    <View style={styles.selectionIndicator} pointerEvents="none" />

                    <Animated.FlatList
                        data={daysData}
                        keyExtractor={(item) => item.toString()}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        contentContainerStyle={{
                            paddingVertical: (SCREEN_HEIGHT * 0.4) - (ITEM_HEIGHT / 2),
                            paddingBottom: (SCREEN_HEIGHT * 0.4),
                        }}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                            const day = daysData[Math.min(Math.max(index, 0), daysData.length - 1)];
                            setTripDays(day);
                        }}
                        getItemLayout={(_, index) => ({
                            length: ITEM_HEIGHT,
                            offset: ITEM_HEIGHT * index,
                            index,
                        })}
                        initialScrollIndex={Math.max(0, tripDays - 1)}
                        renderItem={({ item, index }) => {
                            const inputRange = [
                                (index - 2) * ITEM_HEIGHT,
                                (index - 1) * ITEM_HEIGHT,
                                index * ITEM_HEIGHT,
                                (index + 1) * ITEM_HEIGHT,
                                (index + 2) * ITEM_HEIGHT,
                            ];

                            const scale = scrollY.interpolate({
                                inputRange,
                                outputRange: [0.6, 0.7, 1.2, 0.7, 0.6],
                                extrapolate: 'clamp',
                            });

                            const opacity = scrollY.interpolate({
                                inputRange,
                                outputRange: [0, 0.3, 1, 0.3, 0],
                                extrapolate: 'clamp',
                            });

                            return (
                                <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                                    <Animated.Text
                                        style={[
                                            styles.wheelItemText,
                                            {
                                                transform: [{ scale }],
                                                opacity,
                                                color: index === (tripDays - 1) ? '#000000' : '#4B5563'
                                            }
                                        ]}
                                    >
                                        {item}
                                    </Animated.Text>
                                </View>
                            );
                        }}
                    />
                </View>

                <View style={styles.bottomButtonSafe}>
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleDurationConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const onSwipeComplete = (action: 'like' | 'pass') => {
        if (action === 'like') {
            toggleSpotSelection(swipeIndex);
        }

        const nextIndex = swipeIndex + 1;
        if (nextIndex >= spots.length) {
            handleCreateTrip(true);
        } else {
            setSwipeIndex(nextIndex);
        }
    };

    // Prefetch next images for smoother swiping
    useEffect(() => {
        if (spots.length > 0 && swipeIndex < spots.length - 1) {
            const nextSpot = spots[swipeIndex + 1];
            if (nextSpot?.imageUrl) Image.prefetch(nextSpot.imageUrl);

            // Look ahead one more
            if (swipeIndex + 2 < spots.length) {
                const moreNextSpot = spots[swipeIndex + 2];
                if (moreNextSpot?.imageUrl) Image.prefetch(moreNextSpot.imageUrl);
            }
        }
    }, [swipeIndex, spots]);

    const triggerSwipe = (direction: 'left' | 'right') => {
        cardRef.current?.swipe(direction);
    };

    const renderSwipeStep = () => {
        const currentSpot = spots[swipeIndex];

        if (!currentSpot) {
            return (
                <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#3ED598" />
                    <Text style={{ marginTop: 20, color: '#6B7280' }}>Wrapping up...</Text>
                </View>
            );
        }

        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.stepContainer}>
                    {/* Header - Absolute top */}
                    <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 }}>
                        <TouchableOpacity onPress={() => setStep('duration')} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Swipe to Build</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Main Content Area */}
                    <View style={{ flex: 1, paddingTop: insets.top + 60, paddingBottom: 100, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[styles.bodyText, { textAlign: 'center', marginBottom: 10, color: '#6B7280' }]}>
                            Spot {swipeIndex + 1} of {spots.length}
                        </Text>

                        {/* Card Stack */}
                        <View style={{ width: SCREEN_WIDTH - 40, height: SCREEN_HEIGHT * 0.66, alignItems: 'center', justifyContent: 'center' }}>
                            {/* Next Card Preview (Behind) */}
                            {swipeIndex + 1 < spots.length && (
                                <View style={[styles.swipeCard, { position: 'absolute', transform: [{ scale: 0.95 }, { translateY: 10 }], opacity: 0.5, zIndex: 0 }]}>
                                    <Image
                                        source={{ uri: spots[swipeIndex + 1].imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' }}
                                        style={styles.swipeCardImage}
                                        resizeMode="cover"
                                    />
                                    {/* Minimal Overlay for next card */}
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                                        style={styles.swipeCardOverlay}
                                    />
                                </View>
                            )}

                            {/* Current Card - Interactive */}
                            <SwipeableCard
                                // key={swipeIndex} // Removed to prevent unmounting!
                                ref={cardRef}
                                spot={currentSpot}
                                onSwipe={onSwipeComplete}
                            />
                        </View>
                    </View>

                    {/* Bottom Buttons - Absolute Bottom */}
                    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={[styles.swipeButton, { backgroundColor: '#FFFFFF' }]}
                            onPress={() => triggerSwipe('left')}
                        >
                            <Ionicons name="close" size={40} color="#FF5864" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.swipeButton, { backgroundColor: '#FFFFFF', transform: [{ scale: 1.1 }] }]}
                            onPress={() => triggerSwipe('right')}
                        >
                            <Ionicons name="heart" size={40} color="#3ED598" />
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureHandlerRootView>
        );
    };

    const renderDiscoverStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.discoverHeader}>
                <Text style={styles.discoverTitle}>Discover spots</Text>
            </View>

            {/* Category Filters */}
            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {['All', 'Attractions', 'Museum', 'Parks', 'Food'].map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChipNew,
                                activeFilter === filter && styles.filterChipActiveNew
                            ]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[
                                styles.filterTextNew,
                                activeFilter === filter && styles.filterTextActiveNew
                            ]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={styles.loadingText}>Finding best spots...</Text>
                </View>
            ) : (
                <>
                    {/* Spots List */}
                    <FlatList
                        data={filteredSpots}
                        keyExtractor={(item, index) => `spot-${index}`}
                        style={styles.spotsList}
                        contentContainerStyle={{ paddingBottom: 150 }}
                        ListHeaderComponent={() => (
                            /* City Header Section */
                            <View style={styles.citySectionNew}>
                                <View style={styles.cityHeaderNew}>
                                    <View style={styles.cityDotNew} />
                                    <Text style={styles.cityNameNew}>{selectedDestination?.name || 'City'}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#D1D5DB" style={{ marginLeft: 'auto' }} />
                                </View>
                            </View>
                        )}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={styles.spotItemNew}
                                onPress={() => toggleSpotSelection(index)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.spotNumberNew}>{index + 1}.</Text>

                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.spotImageNew}
                                />

                                <View style={styles.spotInfoNew}>
                                    <Text style={styles.spotNameNew} numberOfLines={1}>
                                        <Text style={{ fontSize: 14 }}>✨</Text> {item.name}
                                    </Text>
                                    <Text style={styles.spotDescriptionNew} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </View>

                                <View style={[
                                    styles.spotCheckboxNew,
                                    selectedSpots.has(spots.indexOf(item)) && styles.spotCheckboxSelectedNew
                                ]}>
                                    {selectedSpots.has(spots.indexOf(item)) && (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />

                    {/* Bottom Button */}
                    <View style={styles.discoverButtonsNew}>
                        <TouchableOpacity
                            style={styles.continueButtonNew}
                            onPress={() => handleCreateTrip(true)} // Always continue, selected spots handling inside
                        >
                            <Text style={styles.continueButtonTextNew}>
                                {selectedSpots.size > 0
                                    ? `Continue with ${selectedSpots.size} spots`
                                    : 'Continue without spots'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );

    return (
        <LinearGradient
            colors={['#FFFFFF', '#E9FBF4', '#FFFFFF']}
            locations={[0, 0.5, 1]}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['left', 'right']}>
                {/* Close Button - only on first step, and hidden when searching */}
                {step === 'destination' && !isSearchActive && (
                    <TouchableOpacity style={[styles.closeButton, { top: insets.top + 20 }]} onPress={() => router.back()}>
                        <View style={styles.closeButtonInner}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Render Current Step */}
                {step === 'destination' && renderDestinationStep()}

                {/* Mode Selection Step */}
                {step === 'mode-selection' ? (
                    <LinearGradient
                        colors={['#FFFFFF', '#F9FAFB', '#F9FAFB']}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {step === 'mode-selection' && renderModeSelectionStep()}

                {/* Custom Gradient for Preferences Step */}
                {step === 'preferences' ? (
                    <LinearGradient
                        colors={['#BAE6FD', '#FFFFFF', '#FFFFFF']}
                        locations={[0, 0.4, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {step === 'preferences' && renderPreferencesStep()}
                {/* Custom Gradient for Duration Step - Teal fade */}
                {step === 'duration' ? (
                    <LinearGradient
                        colors={['#E9FBF4', '#FFFFFF', '#FFFFFF']} // Soft Mint to White
                        locations={[0, 0.4, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {step === 'duration' && renderDurationStep()}
                {/* Swipe Step for Tinder Mode */}
                {step === 'swipe' ? (
                    <LinearGradient
                        colors={['#FFFFFF', '#F9FAFB']}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {step === 'swipe' && renderSwipeStep()}

                {/* List Step for Classic Mode */}
                {step === 'discover' && renderDiscoverStep()}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS.sheet,
        borderTopRightRadius: RADIUS.sheet,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 10,
        paddingBottom: 50,
    },
    sheetHandleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    sheetHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#E5E7EB',
    },
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 20,
    },
    closeButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchResultsContainer: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        gap: SPACING.sm,
        // Removed border
    },
    searchField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 16, // Increased to 16pt
        gap: 8,
    },
    searchInputInline: {
        flex: 1,
        color: COLORS.textPrimary,
        ...TYPOGRAPHY.bodyReg, // Use Regular weight
    },
    searchResultItem: {
        paddingHorizontal: SPACING.lg,
        height: 72, // Fixed height 72pt
        justifyContent: 'center',
        // Removed border for cleaner look
    },
    resultName: {
        fontSize: 21, // Increased size
        fontWeight: '500',
        color: '#FFFFFF', // White text
        marginBottom: 2,
    },
    resultCountry: {
        fontSize: 18, // Increased size
        color: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
    },
    countryRowDS: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 80, // Increased height for bigger items
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    countryFlagDS: {
        fontSize: 45, // Increased by 40%
    },
    countryNameDS: {
        fontSize: 28, // Increased by 40%
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    countryPlacesDS: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    searchButtonText: {
        fontSize: 16,
        color: '#1F2937',
    },
    // New Redesign Styles
    countryRowNew: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderBottomWidth: 0,
    },
    countryFlagNew: {
        fontSize: 28,
    },
    countryNameNew: {
        fontSize: 32, // Large bold text
        fontWeight: 'bold',
        color: '#333333',
        letterSpacing: -0.5,
    },
    countryPlacesNew: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0, // Full screen overlay, masked internally
        justifyContent: 'flex-end',
        zIndex: 10,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    modeCardSelected: {
        borderColor: '#3ED598',
        borderWidth: 2,
    },
    modeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    modeTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    modeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    modeDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    swipeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    swipeCard: {
        width: SCREEN_WIDTH - 40,
        height: SCREEN_HEIGHT * 0.55,
        borderRadius: 24,
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    swipeCardImage: {
        width: '100%',
        height: '100%',
    },
    swipeCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingTop: 60,
    },
    swipeCardTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    swipeCardDescription: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
    },
    swipeActions: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        width: '100%',
        paddingBottom: 40,
        paddingTop: 20,
    },
    swipeButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        backgroundColor: '#FFFFFF',
    },
    passButton: {
        // specific styles if needed
    },
    likeButton: {
        // specific styles if needed
    },
    topGradientFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 20,
    },
    volumetricContainer: {
        flex: 1,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    blobBase: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.6,
    },
    blobMint: { // #3ED598
        bottom: -50,
        left: '10%',
        width: 400,
        height: 350,
        backgroundColor: '#3ED598',
        opacity: 0.5,
    },
    blobJade: { // #00A86B
        bottom: -100,
        left: -80,
        width: 450,
        height: 450,
        backgroundColor: '#00A86B',
        opacity: 0.4,
    },
    blobEmerald: { // #50C878
        bottom: 20,
        right: -50,
        width: 300,
        height: 400,
        backgroundColor: '#50C878',
        opacity: 0.35,
    },
    blobTeal: { // #008080 - Deep shadow
        bottom: -20,
        right: '20%',
        width: 380,
        height: 380,
        backgroundColor: '#008080',
        opacity: 0.2,
    },
    blobCyan: { // #E0FFFF - Highlight
        bottom: 80,
        left: '30%',
        width: 250,
        height: 250,
        backgroundColor: '#E0FFFF',
        opacity: 0.4,
    },
    blobMist: { // White/Mint mix
        bottom: 0,
        left: 0,
        width: '120%',
        height: 400,
        backgroundColor: '#E9FBF4',
        opacity: 0.3,
    },
    bottomContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        width: '100%',
        alignItems: 'flex-start', // Align text to left
        zIndex: 20,
    },
    bottomTitleNew: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    bottomSubtitleNew: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 32,
        fontWeight: '500',
    },
    searchButtonNew: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 100, // Pill shape
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        gap: 12,
    },

    searchButtonTextNew: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },


    // Preferences Step
    preferencesContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 140, // More space from top for the gradient look
    },
    preferencesHeaderIcon: {
        marginBottom: 20,
    },
    preferencesTitle: {
        fontSize: 34, // Larger title
        fontWeight: 'bold',
        color: '#000000', // Pitch black
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    preferencesSubtitle: {
        fontSize: 18,
        color: '#9CA3AF',
        marginBottom: 40,
        fontWeight: '500',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16, // Looser gap
        marginBottom: 48, // More space before duration
        justifyContent: 'space-between',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 24, // Rounder
        width: '47%', // Slightly smaller width for gap
        // Softer Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 3,
    },
    categoryChipSelected: {
        // We might want a subtle border or just keep it clean as selected
        // The user image shows white background for unselected, 
        // presumably selected might be different or just a checkmark?
        // The reference image doesn't show selected state explicitly, 
        // but current code has a dark selected state. 
        // I'll keep the dark selected state for now but maybe make it softer per "same style as image" request if the image implied a specific selected state.
        // Actually, let's keep the dark selected state as it is a good UX pattern if not specified otherwise.
        backgroundColor: '#1F2937',
    },
    categoryEmoji: {
        fontSize: 20,
    },
    categoryName: {
        fontSize: 17,
        color: '#1F2937',
        fontWeight: '600',
    },
    categoryNameSelected: {
        color: '#FFFFFF',
    },
    durationPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
    },
    durationPreviewText: {
        fontSize: 22,
        color: '#9CA3AF',
        fontWeight: '700',
    },
    bottomButton: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'transparent',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000', // Black
        borderRadius: 30, // Fully rounded
        paddingVertical: 20,
        gap: 8,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    // Duration Step
    durationHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20, // More top space
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationTitleMain: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#000000',
        paddingHorizontal: 20,
        marginBottom: 20,
        letterSpacing: -0.5,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 4,
        marginLeft: 'auto', // Push to right
    },
    toggleButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    toggleButtonActive: {
        backgroundColor: '#FFFFFF', // Shadow for active
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#000000',
    },
    wheelPickerContainer: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    selectionIndicator: {
        position: 'absolute',
        top: '50%',
        left: 20,
        right: 20,
        height: 60, // Slightly smaller than item height to look nice behind
        marginTop: -30, // Center it
        backgroundColor: '#F3F4F6', // Light grey
        borderRadius: 12,
        opacity: 0.5,
    },
    wheelItemText: {
        fontSize: 54, // Much larger
        fontWeight: '600',
        textAlign: 'center',
    },
    bottomButtonSafe: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'transparent',
    },
    confirmButton: {
        backgroundColor: '#000000',
        borderRadius: 30, // Round
        paddingVertical: 20,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },

    // Discover Step
    discoverHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    discoverTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    filterScroll: {
        paddingHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        flexGrow: 0,
        maxHeight: 44,
    },
    filterScrollContent: {
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#1F2937',
        borderColor: '#1F2937',
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    citySection: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    cityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D1D5DB',
    },
    cityName: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    spotsList: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    spotItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        gap: 12,
        backgroundColor: '#FFFFFF',
    },
    spotNumber: {
        fontSize: 14,
        color: '#9CA3AF',
        width: 24,
    },
    spotImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    spotInfo: {
        flex: 1,
    },
    spotName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    spotDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    spotCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spotCheckboxSelected: {
        backgroundColor: '#3ED598',
        borderColor: '#3ED598',
    },
    discoverButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        gap: 12,
        backgroundColor: '#FFFFFF',
    },
    continueWithSpotsButton: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
    },
    continueWithSpotsText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    withoutSpotsButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    withoutSpotsText: {
        color: '#6B7280',
        fontSize: 14,
    },
    // Discover Redesign Styles
    filterWrapper: {
        marginBottom: 10,
    },
    filterChipNew: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF', // Default white
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    filterChipActiveNew: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    filterTextNew: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    filterTextActiveNew: {
        color: '#000000',
    },
    citySectionNew: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    cityHeaderNew: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cityDotNew: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#D1D5DB', // Light gray dot
        marginRight: 10,
    },
    cityNameNew: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
    },
    spotItemNew: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    spotNumberNew: {
        fontSize: 16,
        color: '#9CA3AF',
        width: 30, // Fixed width for alignment
        fontWeight: '500',
    },
    spotImageNew: {
        width: 56,
        height: 56,
        borderRadius: 12, // Rounded corners
        backgroundColor: '#E5E7EB',
    },
    spotInfoNew: {
        flex: 1,
        marginLeft: 12,
        marginRight: 12,
    },
    spotNameNew: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 2,
    },
    spotDescriptionNew: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    spotCheckboxNew: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F3F4F6', // Unselected gray
        alignItems: 'center',
        justifyContent: 'center',
    },
    spotCheckboxSelectedNew: {
        backgroundColor: '#3ED598', // Selected Mint
    },
    discoverButtonsNew: {
        position: 'absolute',
        bottom: 50, // Increased to 50 for safe area
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    continueButtonNew: {
        backgroundColor: '#000000',
        borderRadius: 30,
        height: 56,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonTextNew: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

