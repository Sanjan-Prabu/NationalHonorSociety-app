// screens/CreateEventScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
    TouchableWithoutFeedback,
    RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from 'components/ui/ToastProvider';
import Tag from 'components/ui/Tag';
import ReliableImagePicker from 'components/ui/ReliableImagePicker';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/EventService';
import ImageUploadService from '../../services/ImageUploadService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OfficerStackParamList } from '../../types/navigation';

const Colors = {
    LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
    primaryBlue: '#4A90E2',
    solidBlue: '#2B5CE6',
    textDark: '#1A202C',
    textMedium: '#4A5568',
    textLight: '#718096',
    white: '#FFFFFF',
    inputBorder: '#D1D5DB',
    inputBackground: '#F9FAFB',
    dividerColor: '#D1D5DB',
    errorRed: '#E53E3E',
    successGreen: '#38A169',
    lightGray: '#F7FAFC',
    lightBlue: '#EBF8FF',
    lightGreen: '#EBF8F2',
};

type EventCategory = 'fundraiser' | 'volunteering' | 'education' | 'custom';

type CreateEventScreenNavigationProp = NativeStackNavigationProp<OfficerStackParamList, 'CreateEvent'>;

interface CreateEventScreenProps {
    navigation: CreateEventScreenNavigationProp;
}

const CreateEventScreen = ({ navigation }: CreateEventScreenProps) => {
    const { showSuccess, showError, showValidationError } = useToast();
    const { activeOrganization } = useOrganization();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    // Form state
    const [eventName, setEventName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
    const [customCategory, setCustomCategory] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<{
        images: string[];
        links: string[];
    }>({
        images: [],
        links: [],
    });
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Image upload state
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    // Category options with their tag variants - each category gets a unique color
    const categoryOptions: { label: EventCategory; displayLabel: string; variant: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' }[] = [
        { label: 'fundraiser', displayLabel: 'Fundraiser', variant: 'green' },
        { label: 'volunteering', displayLabel: 'Volunteering', variant: 'teal' },
        { label: 'education', displayLabel: 'Education', variant: 'purple' },
        { label: 'custom', displayLabel: 'Custom', variant: 'orange' },
    ];

    // Get category box colors based on variant
    const getCategoryBoxColors = (variant: string, isSelected: boolean) => {
        const colors = {
            green: {
                background: isSelected ? '#EBF8F2' : '#F9FAFB',
                border: isSelected ? '#48BB78' : '#EBF8F2'
            },
            teal: {
                background: isSelected ? '#E6FFFA' : '#F9FAFB',
                border: isSelected ? '#38B2AC' : '#E6FFFA'
            },
            purple: {
                background: isSelected ? '#F3E8FF' : '#F9FAFB',
                border: isSelected ? '#9F7AEA' : '#F3E8FF'
            },
            orange: {
                background: isSelected ? '#FEF5E7' : '#F9FAFB',
                border: isSelected ? '#ECC94B' : '#FEF5E7'
            },
        };
        return colors[variant as keyof typeof colors] || colors.orange;
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleAddLink = () => {
        if (!linkUrl.trim()) {
            showValidationError('Link Required', 'Please enter a URL');
            return;
        }

        if (!isValidUrl(linkUrl)) {
            showValidationError('Invalid URL', 'Please enter a valid URL');
            return;
        }

        setAttachments(prev => ({
            ...prev,
            links: [...prev.links, linkUrl.trim()]
        }));
        setLinkUrl('');
        setShowLinkInput(false);
        showSuccess('Link Added', 'Link attached successfully.');
    };

    const removeAttachment = (type: 'images' | 'links', index: number) => {
        setAttachments(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }));
    };

    // Image upload handlers
    const handleImageSelected = async (imageUri: string) => {
        if (!activeOrganization) {
            showError('Error', 'Organization information is missing.');
            return;
        }

        console.log('[CreateEventScreen] Image selected:', imageUri);
        setSelectedImage(imageUri);
        setImageUploadError(null);
        setImageUploading(true);

        try {
            const imageUploadService = ImageUploadService.getInstance();
            const publicUrl = await imageUploadService.uploadPublicImage(
                imageUri,
                'events',
                activeOrganization.id
            );
            
            console.log('[CreateEventScreen] Image uploaded successfully:', publicUrl);
            setUploadedImageUrl(publicUrl);
            showSuccess('Image Uploaded', 'Event image uploaded successfully.');
        } catch (error) {
            console.error('[CreateEventScreen] Image upload failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
            setImageUploadError(errorMessage);
            showError('Upload Failed', errorMessage);
        } finally {
            setImageUploading(false);
        }
    };

    const handleImageRemoved = () => {
        console.log('[CreateEventScreen] Image removed');
        setSelectedImage(null);
        setUploadedImageUrl(null);
        setImageUploadError(null);
    };

    const handleImageValidationError = (error: string) => {
        setImageUploadError(error);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Event name validation
        if (!eventName.trim()) {
            newErrors.eventName = 'Event name is required';
        } else if (eventName.length > 50) {
            newErrors.eventName = 'Event name must be 50 characters or less';
        }

        // Category validation
        if (!selectedCategory) {
            newErrors.category = 'Please select a category';
        } else if (selectedCategory === 'custom' && !customCategory.trim()) {
            newErrors.customCategory = 'Custom category name is required';
        }

        // Date validation
        if (!date) {
            newErrors.date = 'Event date is required';
        }

        // Time validation
        if (!startTime) {
            newErrors.startTime = 'Start time is required';
        }
        if (!endTime) {
            newErrors.endTime = 'End time is required';
        }

        // Location validation
        if (!location.trim()) {
            newErrors.location = 'Location is required';
        }

        // Description validation
        if (description.trim().split(/\s+/).filter((word: string) => word.length > 0).length > 150) {
            newErrors.description = 'Description must be 150 words or less';
        }

        // Link validation
        if (showLinkInput && linkUrl.trim() && !isValidUrl(linkUrl)) {
            newErrors.link = 'Please enter a valid URL';
        }

        // Image upload validation
        if (imageUploading) {
            newErrors.image = 'Please wait for image upload to complete';
        }
        if (imageUploadError) {
            newErrors.image = 'Please resolve image upload error before submitting';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showValidationError('Validation Error', 'Please fill out all required fields correctly.');
            return;
        }

        if (!activeOrganization || !user) {
            showError('Error', 'Organization or user information is missing.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Combine date and time for starts_at and ends_at
            const eventDate = date!;
            const startDateTime = new Date(eventDate);
            const endDateTime = new Date(eventDate);

            if (startTime) {
                startDateTime.setHours(startTime.getHours(), startTime.getMinutes());
            }
            if (endTime) {
                endDateTime.setHours(endTime.getHours(), endTime.getMinutes());
            }

            // Determine the final category value
            const finalCategory = selectedCategory === 'custom' ? customCategory.trim() : selectedCategory || undefined;

            // Prepare final links (include any pending link input)
            const finalLinks = showLinkInput && linkUrl.trim() && isValidUrl(linkUrl)
                ? [...attachments.links, linkUrl.trim()]
                : attachments.links;

            // Create event using EventService
            const result = await eventService.createEvent({
                title: eventName.trim(),
                description: description.trim() || undefined,
                location: location.trim(),
                event_date: eventDate.toISOString().split('T')[0],
                starts_at: startDateTime.toISOString(),
                ends_at: endDateTime.toISOString(),
                category: finalCategory,
                link: finalLinks.length > 0 ? finalLinks[0] : undefined, // Use first link for now
                image_url: uploadedImageUrl || undefined, // Include uploaded image URL
            });

            if (result.success) {
                showSuccess('Event Created', 'Your event has been created successfully.');
                navigation.goBack();
            } else {
                showError('Creation Error', result.error || 'Failed to create event. Please try again.');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            showError('Creation Error', 'Failed to create event. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
                setDate(selectedDate);
            }
        } else {
            if (selectedDate) {
                setDate(selectedDate);
            }
        }
    };

    const handleStartTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowStartTimePicker(false);
            if (event.type === 'set' && selectedTime) {
                setStartTime(selectedTime);
            }
        } else {
            if (selectedTime) {
                setStartTime(selectedTime);
            }
        }
    };

    const handleEndTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowEndTimePicker(false);
            if (event.type === 'set' && selectedTime) {
                setEndTime(selectedTime);
            }
        } else {
            if (selectedTime) {
                setEndTime(selectedTime);
            }
        }
    };



    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (time: Date) => {
        return time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const closeDatePicker = () => {
        setShowDatePicker(false);
    };

    const closeTimePicker = () => {
        setShowStartTimePicker(false);
        setShowEndTimePicker(false);
    };

    const onRefresh = () => {
        setRefreshing(true);
        // Simulate refreshing/resetting the form or fetching data
        setTimeout(() => {
            setRefreshing(false);
            showSuccess('Refreshed', 'Form data has been refreshed.');
        }, 1000);
    };

    return (
        <LinearGradient
            colors={Colors.LandingScreenGradient}
            style={{ flex: 1 }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(60) : 0}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContainer,
                            {
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom,
                            }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.solidBlue}
                                colors={[Colors.solidBlue]}
                            />
                        }
                    >
                        {/* Header with Back Button */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Icon name="arrow-back" size={moderateScale(24)} color={Colors.textDark} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Create New Event</Text>
                            <View style={styles.headerPlaceholder} />
                        </View>

                        {/* Form Container */}
                        <View style={styles.formContainer}>
                            {/* Event Name */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Event Name</Text>
                                <TextInput
                                    style={[styles.textInput, errors.eventName && styles.inputError]}
                                    placeholder="Enter event name"
                                    placeholderTextColor={Colors.textLight}
                                    value={eventName}
                                    onChangeText={setEventName}
                                    maxLength={50}
                                />
                                <Text style={styles.charCount}>
                                    {eventName.length}/50 characters
                                </Text>
                                {errors.eventName && <Text style={styles.errorText}>{errors.eventName}</Text>}
                            </View>

                            {/* Category Selection */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Category</Text>
                                <View style={styles.categoriesContainer}>
                                    {categoryOptions.map((category, index) => {
                                        const isSelected = selectedCategory === category.label;
                                        const boxColors = getCategoryBoxColors(category.variant, isSelected);

                                        return (
                                            <TouchableOpacity
                                                key={category.label}
                                                style={[
                                                    styles.categoryButton,
                                                    {
                                                        backgroundColor: boxColors.background,
                                                        borderColor: boxColors.border,
                                                    }
                                                ]}
                                                onPress={() => {
                                                    setSelectedCategory(category.label);
                                                    // Clear custom category if switching away from custom
                                                    if (category.label !== 'custom') {
                                                        setCustomCategory('');
                                                    }
                                                }}
                                            >
                                                <Tag
                                                    text={category.displayLabel}
                                                    variant={category.variant}
                                                    active={isSelected}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

                                {/* Custom Category Input */}
                                {selectedCategory === 'custom' && (
                                    <View style={styles.customCategoryContainer}>
                                        <TextInput
                                            style={[styles.textInput, errors.customCategory && styles.inputError]}
                                            placeholder="Enter custom category name"
                                            placeholderTextColor={Colors.textLight}
                                            value={customCategory}
                                            onChangeText={setCustomCategory}
                                            maxLength={30}
                                        />
                                        <Text style={styles.charCount}>
                                            {customCategory.length}/30 characters
                                        </Text>
                                        {errors.customCategory && <Text style={styles.errorText}>{errors.customCategory}</Text>}
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Date</Text>
                                <TouchableOpacity
                                    style={[styles.dateInput, errors.date && styles.inputError]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={[
                                        styles.dateText,
                                        !date && styles.datePlaceholder
                                    ]}>
                                        {date ? formatDate(date) : 'mm/dd/yyyy'}
                                    </Text>
                                    <Icon name="calendar-today" size={moderateScale(20)} color={Colors.textMedium} />
                                </TouchableOpacity>
                                {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                            </View>

                            {/* Start Time and End Time */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Start Time & End Time</Text>
                                <View style={styles.timeContainer}>
                                    <TouchableOpacity
                                        style={[styles.timeInput, errors.startTime && styles.inputError]}
                                        onPress={() => setShowStartTimePicker(true)}
                                    >
                                        <Text style={[
                                            styles.timeText,
                                            !startTime && styles.timePlaceholder
                                        ]}>
                                            {startTime ? formatTime(startTime) : '--:-- --'}
                                        </Text>
                                        <Icon name="access-time" size={moderateScale(20)} color={Colors.textMedium} />
                                    </TouchableOpacity>

                                    <Text style={styles.timeSeparator}>to</Text>

                                    <TouchableOpacity
                                        style={[styles.timeInput, errors.endTime && styles.inputError]}
                                        onPress={() => setShowEndTimePicker(true)}
                                    >
                                        <Text style={[
                                            styles.timeText,
                                            !endTime && styles.timePlaceholder
                                        ]}>
                                            {endTime ? formatTime(endTime) : '--:-- --'}
                                        </Text>
                                        <Icon name="access-time" size={moderateScale(20)} color={Colors.textMedium} />
                                    </TouchableOpacity>
                                </View>
                                {(errors.startTime || errors.endTime) && (
                                    <Text style={styles.errorText}>
                                        {errors.startTime || errors.endTime}
                                    </Text>
                                )}
                            </View>

                            {/* Location */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Location</Text>
                                <TextInput
                                    style={[styles.textInput, errors.location && styles.inputError]}
                                    placeholder="Enter event location"
                                    placeholderTextColor={Colors.textLight}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                                <Text style={styles.helperText}>
                                    You can also use GPS assistance for location
                                </Text>
                                {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
                            </View>

                            {/* Description */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.descriptionInput, errors.description && styles.inputError]}
                                    placeholder="Describe the event, volunteer activities, what to bring, etc..."
                                    placeholderTextColor={Colors.textLight}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={750}
                                />
                                <Text style={styles.charCount}>
                                    {description.trim().split(/\s+/).filter((word: string) => word.length > 0).length}/150 words
                                </Text>
                                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                            </View>

                            {/* Event Image */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Event Image</Text>
                                <Text style={styles.helperText}>
                                    Add an image to make your event more engaging
                                </Text>
                                <ReliableImagePicker
                                    onImageSelected={handleImageSelected}
                                    onImageRemoved={handleImageRemoved}
                                    selectedImage={selectedImage}
                                    disabled={isSubmitting}
                                    placeholder="Add Event Image"
                                    loading={imageUploading}
                                    error={imageUploadError}
                                />
                                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
                            </View>

                            {/* Links Section */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Links</Text>
                                <View style={styles.attachmentsContainer}>
                                    <TouchableOpacity
                                        style={styles.attachmentButton}
                                        onPress={() => setShowLinkInput(!showLinkInput)}
                                    >
                                        <Icon name="link" size={moderateScale(24)} color={Colors.solidBlue} />
                                        <Text style={styles.attachmentText}>Add Link</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Link Input */}
                                {showLinkInput && (
                                    <View style={styles.linkInputContainer}>
                                        <TextInput
                                            style={[styles.textInput, errors.link && styles.inputError]}
                                            placeholder="Paste link here..."
                                            placeholderTextColor={Colors.textLight}
                                            value={linkUrl}
                                            onChangeText={setLinkUrl}
                                            keyboardType="url"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <View style={styles.linkActions}>
                                            <TouchableOpacity
                                                style={styles.cancelLinkButton}
                                                onPress={() => {
                                                    setShowLinkInput(false);
                                                    setLinkUrl('');
                                                }}
                                            >
                                                <Text style={styles.cancelLinkText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.addLinkButton}
                                                onPress={handleAddLink}
                                            >
                                                <Text style={styles.addLinkText}>Add Link</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {errors.link && <Text style={styles.errorText}>{errors.link}</Text>}
                                    </View>
                                )}

                                {/* Selected Attachments */}
                                {attachments.links.length > 0 && (
                                    <View style={styles.attachmentsList}>
                                        {attachments.links.map((link, index) => (
                                            <View key={`link-${index}`} style={styles.attachmentItem}>
                                                <Icon name="link" size={moderateScale(16)} color={Colors.textMedium} />
                                                <Text style={styles.attachmentName} numberOfLines={1}>
                                                    {link}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => removeAttachment('links', index)}
                                                    style={styles.removeButton}
                                                >
                                                    <Icon name="close" size={moderateScale(16)} color={Colors.errorRed} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Create Event Button */}
                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.submitButtonText}>
                                    {isSubmitting ? 'Creating Event...' : 'Create Event'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* Date Picker Modal - iOS */}
                    {Platform.OS === 'ios' && showDatePicker && (
                        <Modal
                            visible={showDatePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={closeDatePicker}
                        >
                            <TouchableWithoutFeedback onPress={closeDatePicker}>
                                <View style={styles.modalOverlay}>
                                    <TouchableWithoutFeedback>
                                        <View style={styles.pickerContainer}>
                                            <View style={styles.pickerHeader}>
                                                <TouchableOpacity onPress={closeDatePicker}>
                                                    <Text style={styles.pickerDoneButton}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                value={date || new Date()}
                                                mode="date"
                                                display="spinner"
                                                onChange={handleDateChange}
                                                minimumDate={new Date()}
                                                textColor={Colors.textDark}
                                            />
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
                            </TouchableWithoutFeedback>
                        </Modal>
                    )}

                    {/* Date Picker - Android */}
                    {Platform.OS === 'android' && showDatePicker && (
                        <DateTimePicker
                            value={date || new Date()}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    {/* Start Time Picker Modal - iOS */}
                    {Platform.OS === 'ios' && showStartTimePicker && (
                        <Modal
                            visible={showStartTimePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={closeTimePicker}
                        >
                            <TouchableWithoutFeedback onPress={closeTimePicker}>
                                <View style={styles.modalOverlay}>
                                    <TouchableWithoutFeedback>
                                        <View style={styles.pickerContainer}>
                                            <View style={styles.pickerHeader}>
                                                <TouchableOpacity onPress={closeTimePicker}>
                                                    <Text style={styles.pickerDoneButton}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                value={startTime || new Date()}
                                                mode="time"
                                                display="spinner"
                                                onChange={handleStartTimeChange}
                                                textColor={Colors.textDark}
                                            />
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
                            </TouchableWithoutFeedback>
                        </Modal>
                    )}

                    {/* Start Time Picker - Android */}
                    {Platform.OS === 'android' && showStartTimePicker && (
                        <DateTimePicker
                            value={startTime || new Date()}
                            mode="time"
                            display="default"
                            onChange={handleStartTimeChange}
                        />
                    )}

                    {/* End Time Picker Modal - iOS */}
                    {Platform.OS === 'ios' && showEndTimePicker && (
                        <Modal
                            visible={showEndTimePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={closeTimePicker}
                        >
                            <TouchableWithoutFeedback onPress={closeTimePicker}>
                                <View style={styles.modalOverlay}>
                                    <TouchableWithoutFeedback>
                                        <View style={styles.pickerContainer}>
                                            <View style={styles.pickerHeader}>
                                                <TouchableOpacity onPress={closeTimePicker}>
                                                    <Text style={styles.pickerDoneButton}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                value={endTime || new Date()}
                                                mode="time"
                                                display="spinner"
                                                onChange={handleEndTimeChange}
                                                textColor={Colors.textDark}
                                            />
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
                            </TouchableWithoutFeedback>
                        </Modal>
                    )}

                    {/* End Time Picker - Android */}
                    {Platform.OS === 'android' && showEndTimePicker && (
                        <DateTimePicker
                            value={endTime || new Date()}
                            mode="time"
                            display="default"
                            onChange={handleEndTimeChange}
                        />
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: scale(16),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: verticalScale(16),
        marginBottom: verticalScale(24),
    },
    backButton: {
        padding: scale(8),
    },
    headerTitle: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: Colors.textDark,
        textAlign: 'center',
    },
    headerPlaceholder: {
        width: scale(40),
    },
    formContainer: {
        backgroundColor: 'transparent',
    },
    inputContainer: {
        marginBottom: verticalScale(20),
    },
    inputLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: Colors.solidBlue,
        marginBottom: verticalScale(8),
    },
    textInput: {
        height: verticalScale(52),
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: moderateScale(8),
        paddingHorizontal: scale(16),
        backgroundColor: Colors.white,
        fontSize: moderateScale(16),
        color: Colors.textDark,
    },
    charCount: {
        fontSize: moderateScale(12),
        color: Colors.textLight,
        textAlign: 'right',
        marginTop: verticalScale(4),
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
        justifyContent: 'space-between',
    },
    categoryButton: {
        flexBasis: '48%',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(8),
    },
    customCategoryContainer: {
        marginTop: verticalScale(12),
    },
    dateInput: {
        height: verticalScale(52),
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: moderateScale(8),
        backgroundColor: Colors.white,
        paddingHorizontal: scale(16),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: moderateScale(16),
        color: Colors.textDark,
    },
    datePlaceholder: {
        color: Colors.textLight,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    timeInput: {
        flex: 1,
        height: verticalScale(52),
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: moderateScale(8),
        backgroundColor: Colors.white,
        paddingHorizontal: scale(16),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeText: {
        fontSize: moderateScale(16),
        color: Colors.textDark,
    },
    timePlaceholder: {
        color: Colors.textLight,
    },
    timeSeparator: {
        fontSize: moderateScale(14),
        color: Colors.textMedium,
        fontWeight: '500',
    },
    helperText: {
        fontSize: moderateScale(12),
        color: Colors.textLight,
        marginTop: verticalScale(4),
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: moderateScale(8),
        backgroundColor: Colors.white,
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        fontSize: moderateScale(16),
        color: Colors.textDark,
        minHeight: verticalScale(120),
        textAlignVertical: 'top',
    },

    submitButton: {
        backgroundColor: Colors.solidBlue,
        borderRadius: moderateScale(8),
        paddingVertical: verticalScale(16),
        alignItems: 'center',
        marginTop: verticalScale(8),
        marginBottom: verticalScale(24),
        shadowColor: Colors.solidBlue,
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.3,
        shadowRadius: moderateScale(6),
        elevation: 6,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    submitButtonDisabled: {
        backgroundColor: Colors.textLight,
        shadowOpacity: 0,
        elevation: 0,
    },
    inputError: {
        borderWidth: 1,
        borderColor: Colors.errorRed,
    },
    errorText: {
        color: Colors.errorRed,
        fontSize: moderateScale(12),
        marginTop: verticalScale(4),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        paddingBottom: verticalScale(20),
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(12),
        borderBottomWidth: 1,
        borderBottomColor: Colors.inputBorder,
    },
    pickerDoneButton: {
        fontSize: moderateScale(16),
        color: Colors.solidBlue,
        fontWeight: '600',
    },
    attachmentsContainer: {
        flexDirection: 'row',
        gap: scale(12),
        marginBottom: verticalScale(12),
    },
    attachmentButton: {
        flex: 1,
        height: verticalScale(80),
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.inputBorder,
        borderRadius: moderateScale(8),
        backgroundColor: Colors.inputBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentText: {
        fontSize: moderateScale(12),
        color: Colors.solidBlue,
        fontWeight: '500',
        marginTop: verticalScale(6),
    },
    attachmentButtonDisabled: {
        backgroundColor: Colors.lightGray,
        borderColor: Colors.textLight,
    },
    attachmentTextDisabled: {
        fontSize: moderateScale(12),
        color: Colors.textLight,
        fontWeight: '500',
        marginTop: verticalScale(2),
    },
    comingSoonText: {
        fontSize: moderateScale(10),
        color: Colors.textLight,
        fontStyle: 'italic',
        marginTop: verticalScale(2),
    },
    linkInputContainer: {
        marginTop: verticalScale(12),
        marginBottom: verticalScale(12),
    },
    linkActions: {
        flexDirection: 'row',
        gap: scale(12),
        marginTop: verticalScale(12),
    },
    cancelLinkButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        backgroundColor: Colors.white,
        alignItems: 'center',
    },
    cancelLinkText: {
        fontSize: moderateScale(14),
        color: Colors.textMedium,
        fontWeight: '500',
    },
    addLinkButton: {
        flex: 1,
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(8),
        backgroundColor: Colors.solidBlue,
        alignItems: 'center',
    },
    addLinkText: {
        fontSize: moderateScale(14),
        color: Colors.white,
        fontWeight: '500',
    },
    attachmentsList: {
        marginTop: verticalScale(12),
        marginBottom: verticalScale(8),
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        borderRadius: moderateScale(6),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(12),
        marginBottom: verticalScale(6),
    },
    attachmentName: {
        flex: 1,
        fontSize: moderateScale(12),
        color: Colors.textMedium,
        marginLeft: scale(8),
    },
    removeButton: {
        padding: scale(4),
    },
});

export default withRoleProtection(CreateEventScreen, {
    requiredRole: 'officer',
    loadingMessage: 'Verifying officer access...'
});