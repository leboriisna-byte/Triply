import { useState, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { countries, tripCategories, searchDestinations } from '../../lib/tripData';
import { generateFullTrip, GeneratedSpot, TripPreferences, DayPlan } from '../../lib/gemini';
import { useAuth } from '../../hooks/useAuth';
import { useTrips } from '../../hooks/useTrips';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type WizardStep = 'destination' | 'preferences' | 'duration' | 'discover';

interface SelectedDestination {
    name: string;
    country: string;
    flag: string;
}

export default function TripWizardScreen() {
    const [step, setStep] = useState<WizardStep>('destination');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ name: string; country: string; flag: string }[]>([]);
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

    const slideAnim = useRef(new Animated.Value(0)).current;
    const { user, isGuest } = useAuth();
    const { createTrip, saveTripItinerary } = useTrips();

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setSearchResults(searchDestinations(query));
        } else {
            setSearchResults([]);
        }
    };

    const selectDestination = (dest: { name: string; country: string; flag: string }) => {
        setSelectedDestination(dest);
        setSearchQuery(dest.name);
        setSearchResults([]);
        // Auto-advance to next step
        setTimeout(() => setStep('preferences'), 300);
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
            const allSpots = generatedItinerary.flatMap(day => day.spots);
            setSpots(allSpots);

            // Select all spots by default
            setSelectedSpots(new Set(allSpots.map((_, i) => i)));

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

    const renderDestinationStep = () => (
        <View style={styles.stepContainer}>
            {/* Search Results / Overlay Mode */}
            {searchQuery && searchQuery.trim().length > 0 ? (
                <View style={[styles.searchResultsContainer, { paddingTop: 40 }]}>
                    <View style={styles.searchHeader}>
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.searchInputInline}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                            placeholder="Data, Indonesia etc."
                        />
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => selectDestination(item)}
                            >
                                <Text style={styles.resultName}>{item.name}</Text>
                                {item.country && (
                                    <Text style={styles.resultCountry}>{item.country}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Full Screen List */}
                    <FlatList
                        data={countries}
                        keyExtractor={(item) => item.code}
                        contentContainerStyle={{ paddingTop: 60, paddingBottom: 350 }} // Huge padding bottom for overlay
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.countryRowNew}
                                onPress={() => selectDestination({ name: item.name, country: '', flag: item.flag })}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Text style={styles.countryFlagNew}>{item.flag}</Text>
                                    <Text style={styles.countryNameNew}>{item.name}</Text>
                                </View>
                                <Text style={styles.countryPlacesNew}>{item.cities.length} places</Text>
                            </TouchableOpacity>
                        )}
                    />

                    {/* Bottom Gradient Overlay */}
                    <LinearGradient
                        colors={['transparent', 'rgba(14, 165, 233, 0.4)', '#0EA5E9', '#0284C7']}
                        locations={[0, 0.2, 0.5, 1]}
                        style={styles.bottomOverlay}
                        pointerEvents="box-none"
                    >
                        <View style={styles.bottomContent}>
                            <Text style={styles.bottomTitleNew}>Where are we going?</Text>
                            <Text style={styles.bottomSubtitleNew}>Search for your destination</Text>

                            <TouchableOpacity
                                style={styles.searchButtonNew}
                                onPress={() => setSearchQuery(' ')} // Trigger search mode
                            >
                                <Ionicons name="search" size={20} color="#000000" />
                                <Text style={styles.searchButtonTextNew}>Search</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            )}
        </View>
    );

    const renderPreferencesStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.preferencesContent}>
                <View style={styles.preferencesHeaderIcon}>
                    <Ionicons name="thumbs-up" size={32} color="#60A5FA" />
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
            colors={['#FFFFFF', '#E8F4FC', '#FFFFFF']}
            locations={[0, 0.5, 1]}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                {/* Close Button - only on first step */}
                {step === 'destination' && (
                    <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                        <View style={styles.closeButtonInner}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Render Current Step */}
                {step === 'destination' && renderDestinationStep()}
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
                        colors={['#CCFBF1', '#FFFFFF', '#FFFFFF']} // Teal-100 to White
                        locations={[0, 0.4, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {step === 'duration' && renderDurationStep()}
                {step === 'discover' && renderDiscoverStep()}
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
    closeButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        zIndex: 100,
    },
    closeButtonInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContainer: {
        flex: 1,
    },

    // Destination Step
    destinationScroll: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    countryFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    countryName: {
        flex: 1,
        fontSize: 18,
        color: '#1F2937',
    },
    countryPlaces: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    bottomSection: {
        padding: 20,
        paddingBottom: 100,
    },
    bottomTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3B82F6',
        marginBottom: 8,
    },
    bottomSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 16,
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
        height: 300, // Reduced height (was 380)
        justifyContent: 'flex-end',
        paddingBottom: 50, // Increased to account for device bottom inset
        zIndex: 10,
    },
    bottomContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    bottomTitleNew: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    bottomSubtitleNew: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 30,
        textAlign: 'center',
    },
    searchButtonNew: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingVertical: 18,
        gap: 10,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    searchButtonTextNew: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    searchResultsContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    searchInputInline: {
        flex: 1,
        fontSize: 18,
        color: '#1F2937',
    },
    searchResultItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    resultName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#3B82F6',
    },
    resultCountry: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
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
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
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
        backgroundColor: '#3B82F6', // Selected Blue
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

