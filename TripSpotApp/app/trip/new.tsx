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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { countries, tripCategories, searchDestinations } from '../../lib/tripData';
import { generateSpots, generateItinerary, GeneratedSpot, TripPreferences } from '../../lib/gemini';
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
    const [spots, setSpots] = useState<GeneratedSpot[]>([]);
    const [selectedSpots, setSelectedSpots] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

    const slideAnim = useRef(new Animated.Value(0)).current;
    const { user, isGuest } = useAuth();
    const { createTrip } = useTrips();

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

            const generatedSpots = await generateSpots(preferences);
            setSpots(generatedSpots);
            // Select all spots by default
            setSelectedSpots(new Set(generatedSpots.map((_, i) => i)));
        } catch (error) {
            console.error('Failed to generate spots:', error);
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
        if (!selectedDestination) return;

        if (isGuest || !user) {
            router.push('/auth');
            return;
        }

        setLoading(true);
        try {
            const selectedSpotsList = withSpots
                ? spots.filter((_, i) => selectedSpots.has(i))
                : [];

            const trip = await createTrip({
                user_id: user.id,
                name: `${tripDays}-Day ${selectedDestination.name} Trip`,
                destination: selectedDestination.name,
                duration_days: tripDays,
            });

            // Navigate to trip planner with spots data
            router.replace({
                pathname: `/trip/${trip.id}`,
                params: {
                    newTrip: 'true',
                    spotsJson: JSON.stringify(selectedSpotsList),
                },
            });
        } catch (error) {
            console.error('Failed to create trip:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSpots = activeFilter === 'All'
        ? spots
        : spots.filter(s => s.category === activeFilter.toLowerCase());

    const renderDestinationStep = () => (
        <View style={styles.stepContainer}>
            {/* Search Results */}
            {searchQuery && searchResults.length > 0 ? (
                <View style={styles.searchResultsContainer}>
                    <View style={styles.searchHeader}>
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.searchInputInline}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
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
                <>
                    {/* Popular Destinations */}
                    <ScrollView style={styles.destinationScroll} showsVerticalScrollIndicator={false}>
                        {countries.slice(0, 6).map((country, index) => (
                            <TouchableOpacity
                                key={country.code}
                                style={styles.countryRow}
                                onPress={() => selectDestination({ name: country.name, country: '', flag: country.flag })}
                            >
                                <Text style={styles.countryFlag}>{country.flag}</Text>
                                <Text style={styles.countryName}>{country.name}</Text>
                                <Text style={styles.countryPlaces}>{country.cities.length} places</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Bottom Section */}
                    <View style={styles.bottomSection}>
                        <Text style={styles.bottomTitle}>Where are we going?</Text>
                        <Text style={styles.bottomSubtitle}>Search for your destination</Text>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => setSearchQuery(' ')}
                        >
                            <Ionicons name="search" size={20} color="#1F2937" />
                            <Text style={styles.searchButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );

    const renderPreferencesStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.preferencesContent}>
                <Text style={styles.preferencesEmoji}>👍</Text>
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
                    <Ionicons name="calendar-outline" size={24} color="#6B7280" />
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

    const renderDurationStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.durationHeader}>
                <TouchableOpacity onPress={() => setStep('preferences')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.durationTitle}>How many days?</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.dayPickerScroll}
                contentContainerStyle={styles.dayPickerContent}
                showsVerticalScrollIndicator={false}
            >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(day => (
                    <TouchableOpacity
                        key={day}
                        style={[styles.dayOption, tripDays === day && styles.dayOptionSelected]}
                        onPress={() => setTripDays(day)}
                    >
                        <Text style={[styles.dayText, tripDays === day && styles.dayTextSelected]}>
                            {day} {day === 1 ? 'day' : 'days'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

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

    const renderDiscoverStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.discoverHeader}>
                <Text style={styles.discoverTitle}>Discover spots</Text>
            </View>

            {/* Category Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterScrollContent}
            >
                {['All', 'Attractions', 'Museum', 'Parks', 'Food'].map(filter => (
                    <TouchableOpacity
                        key={filter}
                        style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Discovering amazing spots...</Text>
                </View>
            ) : (
                <>
                    {/* City Section */}
                    <View style={styles.citySection}>
                        <View style={styles.cityHeader}>
                            <View style={styles.cityDot} />
                            <Text style={styles.cityName}>{selectedDestination?.name}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </View>
                    </View>

                    {/* Spots List */}
                    <FlatList
                        data={filteredSpots}
                        keyExtractor={(item, index) => `spot-${index}`}
                        style={styles.spotsList}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={styles.spotItem}
                                onPress={() => toggleSpotSelection(index)}
                            >
                                <Text style={styles.spotNumber}>{index + 1}.</Text>
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.spotImage}
                                />
                                <View style={styles.spotInfo}>
                                    <Text style={styles.spotName} numberOfLines={1}>
                                        ✨ {item.name}
                                    </Text>
                                    <Text style={styles.spotDescription} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.spotCheckbox,
                                    selectedSpots.has(spots.indexOf(item)) && styles.spotCheckboxSelected
                                ]}>
                                    {selectedSpots.has(spots.indexOf(item)) && (
                                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />

                    {/* Bottom Buttons */}
                    <View style={styles.discoverButtons}>
                        <TouchableOpacity
                            style={styles.continueWithSpotsButton}
                            onPress={() => handleCreateTrip(true)}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.continueWithSpotsText}>
                                    Continue with {selectedSpots.size} spots
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.withoutSpotsButton}
                            onPress={() => handleCreateTrip(false)}
                        >
                            <Text style={styles.withoutSpotsText}>Continue without spots</Text>
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
            <SafeAreaView style={styles.container}>
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
                {step === 'preferences' && renderPreferencesStep()}
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
        paddingTop: 80,
    },
    preferencesEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    preferencesTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    preferencesSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    categoryChipSelected: {
        backgroundColor: '#1F2937',
        borderColor: '#1F2937',
    },
    categoryEmoji: {
        fontSize: 16,
    },
    categoryName: {
        fontSize: 14,
        color: '#1F2937',
    },
    categoryNameSelected: {
        color: '#FFFFFF',
    },
    durationPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    durationPreviewText: {
        fontSize: 16,
        color: '#6B7280',
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
        backgroundColor: '#1F2937',
        borderRadius: 12,
        paddingVertical: 18,
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    dayPickerScroll: {
        flex: 1,
    },
    dayPickerContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    dayOption: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginBottom: 8,
    },
    dayOptionSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    dayText: {
        fontSize: 20,
        color: '#9CA3AF',
        fontWeight: '400',
        textAlign: 'center',
    },
    dayTextSelected: {
        color: '#1F2937',
        fontWeight: '600',
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
        backgroundColor: '#1F2937',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
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
});

