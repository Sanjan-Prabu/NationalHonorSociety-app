import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from '../../components/ui/ToastProvider';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizationEvents } from '../../hooks/useEventData';
import { useVolunteerHourSubmission, useVolunteerHoursRealTime, useUpdateVolunteerHours } from '../../hooks/useVolunteerHoursData';
import { useCurrentOrganizationId } from '../../hooks/useUserData';
import { CreateVolunteerHourRequest, VolunteerHourData } from '../../types/dataService';
import SearchableDropdown, { DropdownOption } from '../../components/ui/SearchableDropdown';
import ImagePicker from '../../components/ui/ImagePicker';
import ImageUploadService from '../../services/ImageUploadService';

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
  lightBlue: '#EBF8FF',
};

const VolunteerHoursForm = ({ navigation, route }: any) => {
  const { showSuccess, showError, showValidationError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const currentOrgId = useCurrentOrganizationId();
  
  // Get editing data from navigation params
  const editingHour: VolunteerHourData | undefined = route?.params?.editingHour;
  const isEditing = !!editingHour;

  // BLAZING FAST form initialization with memoized parsing ⚡
  const initialState = useMemo(() => {
    if (!editingHour) {
      return {
        eventType: 'internal' as const,
        selectedEvent: '',
        customEventName: '',
        date: null,
        hours: '',
        additionalNotes: '',
        selectedImage: null
      };
    }

    // INSTANT parsing - no repeated regex calls
    const isInternal = !!editingHour.event_id;
    const desc = editingHour.description || '';
    const match = desc.match(/^(External Hours: |Internal Hours: )(.+?)( - (.+))?$/);
    const activityName = editingHour.event_name || (match ? match[2] : desc.split(' - ')[0].replace(/^(External Hours: |Internal Hours: )/, ''));
    const notes = match && match[4] ? match[4] : (desc.includes(' - ') ? desc.split(' - ').slice(1).join(' - ') : '');

    return {
      eventType: isInternal ? 'internal' as const : 'external' as const,
      selectedEvent: editingHour.event_id || '',
      customEventName: isInternal ? '' : activityName,
      date: editingHour.activity_date ? new Date(editingHour.activity_date) : null,
      hours: editingHour.hours.toString(),
      additionalNotes: notes,
      selectedImage: editingHour.attachment_file_id ? 'existing' : null
    };
  }, [editingHour]);

  // Form state
  const [eventType, setEventType] = useState<'internal' | 'external'>(initialState.eventType);
  const [selectedEvent, setSelectedEvent] = useState(initialState.selectedEvent);
  const [customEventName, setCustomEventName] = useState(initialState.customEventName);
  const [date, setDate] = useState<Date | null>(initialState.date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hours, setHours] = useState(initialState.hours);
  const [additionalNotes, setAdditionalNotes] = useState(initialState.additionalNotes);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialState.selectedImage);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => currentOrgId || activeOrganization?.id || '', [currentOrgId, activeOrganization?.id]);

  // Setup real-time subscription for instant updates
  useVolunteerHoursRealTime(organizationId);

  // Use dynamic data hooks
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    isError: eventsError 
  } = useOrganizationEvents(organizationId);

  const submitVolunteerHoursMutation = useVolunteerHourSubmission();
  const updateVolunteerHoursMutation = useUpdateVolunteerHours();

  // Transform events data for dropdown
  const clubEvents: DropdownOption[] = useMemo(() => {
    return eventsData?.map(event => ({
      label: event.title,
      value: event.id
    })) || [];
  }, [eventsData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Event validation
    if (eventType === 'internal' && !selectedEvent) {
      newErrors.event = 'Please select an organization event';
    } else if (eventType === 'external' && !customEventName.trim()) {
      newErrors.customEvent = 'External activity name is required';
    }

    // Date validation
    if (!date) {
      newErrors.date = 'Date of volunteering is required';
    }

    // Hours validation
    if (!hours) {
      newErrors.hours = 'Number of hours is required';
    } else {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        newErrors.hours = 'Please enter a valid number of hours';
      } else if (hoursNum > 24) {
        newErrors.hours = 'Hours cannot exceed 24 per day';
      }
    }

    // Additional notes validation (optional, but check length if provided)
    if (additionalNotes.trim().split(/\s+/).length > 150) {
      newErrors.notes = 'Additional notes must be 150 words or less';
    }

    // Image validation (required)
    if (!selectedImage || selectedImage === 'existing') {
      newErrors.image = 'Proof of volunteering image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    if (!validateForm()) {
      showValidationError('Validation Error', 'Please fill out all required fields correctly.');
      return;
    }

    // Check if image is still uploading
    if (imageUploading) {
      showValidationError('Upload in Progress', 'Please wait for the image to finish uploading.');
      return;
    }

    // Check for image upload errors
    if (imageUploadError) {
      showValidationError('Image Upload Error', 'Please resolve the image upload error before submitting.');
      return;
    }

    setIsSubmitting(true);

    if (!activeOrganization?.id || !user?.id) {
      showError('Error', 'Unable to submit hours. Please try again.');
      return;
    }

    try {
      let imagePath: string | undefined;

      // Handle image upload if a new image is selected
      if (selectedImage && selectedImage !== 'existing') {
        try {
          setImageUploading(true);
          setImageUploadError(null);
          
          if (!activeOrganization?.id) {
            throw new Error('No active organization found');
          }

          const imageUploadService = ImageUploadService.getInstance();
          imagePath = await imageUploadService.uploadPublicImage(
            selectedImage,
            'proof-images',
            activeOrganization.id
          );
        } catch (imageError) {
          const errorMessage = imageError instanceof Error ? imageError.message : 'Image upload failed';
          setImageUploadError(errorMessage);
          showError('Image Upload Failed', errorMessage);
          setImageUploading(false);
          return;
        } finally {
          setImageUploading(false);
        }
      }

      // Prepare submission data
      const submissionData: CreateVolunteerHourRequest = {
        activity_date: date?.toISOString().split('T')[0] || '', // Format as YYYY-MM-DD
        hours: parseFloat(hours),
        description: eventType === 'internal' ?
          `Internal Hours: ${clubEvents.find(e => e.value === selectedEvent)?.label || 'Unknown Event'}${additionalNotes ? ` - ${additionalNotes}` : ''}` :
          `External Hours: ${customEventName}${additionalNotes ? ` - ${additionalNotes}` : ''}`,
        event_id: eventType === 'internal' ? selectedEvent : undefined,
        image_url: imagePath, // Store the public URL for proof images
      };

      if (isEditing && editingHour) {
        // ⚡ INSTANT UPDATE - optimized payload
        const updateData = {
          ...submissionData,
          status: 'pending' as const,
          rejection_reason: null,
          verified_by: null,
          verified_at: null,
        };

        await updateVolunteerHoursMutation.mutateAsync({
          hourId: editingHour.id,
          updates: updateData
        });

        showSuccess('⚡ Updated!', 'Hours updated and resubmitted instantly!');
      } else {
        // ⚡ INSTANT SUBMIT
        await submitVolunteerHoursMutation.mutateAsync(submissionData);
        showSuccess('⚡ Submitted!', 'Hours submitted instantly!');
      }

      // ⚡ INSTANT form reset and navigation - no delays!
      resetForm();
      navigation.goBack(); // INSTANT navigation!

    } catch (error) {
      console.error('Error submitting volunteer hours:', error);
      showError('Submission Error', 'Failed to submit volunteer hours. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEventType('internal');
    setSelectedEvent('');
    setCustomEventName('');
    setDate(null);
    setHours('');
    setAdditionalNotes('');
    setSelectedImage(null);
    setImageUploadError(null);
    setErrors({});
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };



  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const handleImageSelected = (imageUri: string) => {
    setSelectedImage(imageUri);
    setImageUploadError(null);
    // Clear image validation error when image is selected
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setImageUploadError(null);
  };

  const handleImageValidationError = (error: string) => {
    setImageUploadError(error);
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
          >
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={moderateScale(24)} color={Colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{isEditing ? 'Edit Volunteer Hours' : 'Add Volunteer Hours'}</Text>
              <View style={styles.headerPlaceholder} />
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Event Type Selection */}
              <Text style={styles.sectionTitle}>Volunteer Activity Type</Text>
              <View style={styles.eventTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.eventTypeButton,
                    eventType === 'internal' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => {
                    setEventType('internal');
                    setSelectedEvent('');
                    setCustomEventName('');
                  }}
                >
                  <Icon 
                    name="event" 
                    size={moderateScale(18)} 
                    color={eventType === 'internal' ? Colors.solidBlue : Colors.textMedium} 
                    style={styles.eventTypeIcon}
                  />
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'internal' && styles.eventTypeTextActive
                  ]}>
                    Internal Hours
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.eventTypeButton,
                    eventType === 'external' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => {
                    setEventType('external');
                    setSelectedEvent('');
                    setCustomEventName('');
                  }}
                >
                  <Icon 
                    name="add-circle-outline" 
                    size={moderateScale(18)} 
                    color={eventType === 'external' ? Colors.solidBlue : Colors.textMedium} 
                    style={styles.eventTypeIcon}
                  />
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'external' && styles.eventTypeTextActive
                  ]}>
                    External Hours
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Helper Text */}
              <Text style={styles.helperText}>
                {eventType === 'internal' 
                  ? 'Hours from organization events and activities organized by your club.'
                  : 'Hours from volunteer work done outside of your organization events.'
                }
              </Text>

              {/* Event Selector or Custom Input */}
              {eventType === 'internal' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Organization Event</Text>
                  <SearchableDropdown
                    options={clubEvents}
                    selectedValue={selectedEvent}
                    onSelect={setSelectedEvent}
                    placeholder="Select an organization event"
                    searchPlaceholder="Search events..."
                    isLoading={eventsLoading}
                    isError={eventsError}
                    hasError={!!errors.event}
                    emptyStateTitle="No organization events available"
                    emptyStateSubtitle="Contact your officers to create events, or select 'External Hours' to log other volunteer activities."
                    maxHeight={verticalScale(250)}
                  />
                  {errors.event && <Text style={styles.errorText}>{errors.event}</Text>}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>External Activity Name</Text>
                  <TextInput
                    style={[styles.textInput, errors.customEvent && styles.inputError]}
                    placeholder="e.g., Food Bank Volunteer, Community Cleanup, Tutoring"
                    placeholderTextColor={Colors.textLight}
                    value={customEventName}
                    onChangeText={setCustomEventName}
                    maxLength={100}
                  />
                  <Text style={styles.inputHint}>
                    Describe the volunteer activity or organization you worked with
                  </Text>
                  {errors.customEvent && <Text style={styles.errorText}>{errors.customEvent}</Text>}
                </View>
              )}

              {/* Date of Volunteering */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date of Volunteering</Text>
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
                {showDatePicker && (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              {/* Number of Hours */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Number of Hours</Text>
                <View style={[styles.hoursContainer, errors.hours && styles.inputError]}>
                  <TextInput
                    style={styles.hoursInput}
                    placeholder="0.0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                    value={hours}
                    onChangeText={setHours}
                    maxLength={6}
                  />
                  <Text style={styles.hoursSuffix}>hours</Text>
                </View>
                {errors.hours && <Text style={styles.errorText}>{errors.hours}</Text>}
              </View>

              {/* Additional Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Additional Notes (Optional)
                  <Text style={styles.optionalText}> - Max 150 words</Text>
                </Text>
                <TextInput
                  style={[styles.notesInput, errors.notes && styles.inputError]}
                  placeholder="Describe your volunteer experience..."
                  placeholderTextColor={Colors.textLight}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={750} // Approximate for 150 words
                />
                <Text style={styles.wordCount}>
                  {additionalNotes.trim().split(/\s+/).filter(word => word.length > 0).length}/150 words
                </Text>
                {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
              </View>

              {/* Proof of Volunteering */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Proof of Volunteering (Required)</Text>
                <ImagePicker
                  onImageSelected={handleImageSelected}
                  onImageRemoved={handleImageRemoved}
                  onValidationError={handleImageValidationError}
                  selectedImage={selectedImage === 'existing' ? undefined : selectedImage || undefined}
                  loading={imageUploading}
                  error={imageUploadError || undefined}
                  placeholder="Upload a photo of your signature sheet or proof"
                  showSuccessIndicator={false}
                />
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
                {selectedImage === 'existing' && (
                  <Text style={styles.existingImageText}>✓ Proof image already uploaded</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (submitVolunteerHoursMutation.isPending || updateVolunteerHoursMutation.isPending || imageUploading || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={submitVolunteerHoursMutation.isPending || updateVolunteerHoursMutation.isPending || imageUploading || isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {(submitVolunteerHoursMutation.isPending || updateVolunteerHoursMutation.isPending || isSubmitting) 
                    ? (isEditing ? 'Updating...' : 'Submitting...') 
                    : (isEditing ? 'Update Hours' : 'Submit Hours')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(16),
  },
  eventTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: moderateScale(8),
    padding: scale(4),
    marginBottom: verticalScale(16),
  },
  eventTypeButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(8),
    borderRadius: moderateScale(6),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  eventTypeButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 2,
  },
  eventTypeIcon: {
    marginRight: scale(6),
  },
  eventTypeText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  eventTypeTextActive: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  helperText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(16),
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
  optionalText: {
    color: Colors.textLight,
    fontWeight: 'normal',
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
  hoursContainer: {
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursInput: {
    flex: 1,
    fontSize: moderateScale(16),
    color: Colors.textDark,
    paddingRight: scale(8),
  },
  hoursSuffix: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(16),
    color: Colors.textDark,
    minHeight: verticalScale(100),
    textAlignVertical: 'top',
  },
  wordCount: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: verticalScale(4),
  },
  existingImageText: {
    fontSize: moderateScale(12),
    color: Colors.successGreen,
    marginTop: verticalScale(4),
    fontWeight: '500',
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
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

  inputHint: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
});

export default VolunteerHoursForm;