import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from '../../components/ui/ToastProvider';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizationEvents } from '../../hooks/useEventData';
import { useVolunteerHourSubmission } from '../../hooks/useVolunteerHoursData';
import { useCurrentOrganizationId } from '../../hooks/useUserData';
import { CreateVolunteerHourRequest } from '../../types/dataService';
import SearchableDropdown, { DropdownOption } from '../../components/ui/SearchableDropdown';

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

const VolunteerHoursForm = ({ navigation }: any) => {
  const { showSuccess, showError, showValidationError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const currentOrgId = useCurrentOrganizationId();

  // Form state
  const [eventType, setEventType] = useState<'club' | 'custom'>('club');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => currentOrgId || activeOrganization?.id || '', [currentOrgId, activeOrganization?.id]);

  // Use dynamic data hooks
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    isError: eventsError 
  } = useOrganizationEvents(organizationId);

  const submitVolunteerHoursMutation = useVolunteerHourSubmission();

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
    if (eventType === 'club' && !selectedEvent) {
      newErrors.event = 'Please select an organization event';
    } else if (eventType === 'custom' && !customEventName.trim()) {
      newErrors.customEvent = 'Custom activity name is required';
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
      }
    }

    // Additional notes validation (optional, but check length if provided)
    if (additionalNotes.trim().split(/\s+/).length > 150) {
      newErrors.notes = 'Additional notes must be 150 words or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showValidationError('Validation Error', 'Please fill out all required fields correctly.');
      return;
    }

    if (!activeOrganization?.id || !user?.id) {
      showError('Error', 'Unable to submit hours. Please try again.');
      return;
    }

    try {
      // Prepare submission data
      const submissionData: CreateVolunteerHourRequest = {
        activity_date: date?.toISOString().split('T')[0] || '', // Format as YYYY-MM-DD
        hours: parseFloat(hours),
        description: eventType === 'club' ?
          `Organization Event: ${clubEvents.find(e => e.value === selectedEvent)?.label || 'Unknown Event'}${additionalNotes ? ` - ${additionalNotes}` : ''}` :
          `${customEventName}${additionalNotes ? ` - ${additionalNotes}` : ''}`,
        event_id: eventType === 'club' ? selectedEvent : undefined,
        // TODO: Handle file upload for selectedImage and notes
      };

      console.log('📝 Submitting volunteer hours:', submissionData);

      await submitVolunteerHoursMutation.mutateAsync(submissionData);

      console.log('✅ Volunteer hours submitted successfully!');
      showSuccess('Hours Submitted', 'Your volunteer hours have been submitted for review.');

      // Reset form after successful submission
      resetForm();

      // Small delay to ensure UI updates complete before navigation
      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error) {
      console.error('Error submitting volunteer hours:', error);
      showError('Submission Error', 'Failed to submit volunteer hours. Please try again.');
    }
  };

  const resetForm = () => {
    setEventType('club');
    setSelectedEvent('');
    setCustomEventName('');
    setDate(null);
    setHours('');
    setAdditionalNotes('');
    setSelectedImage(null);
    setErrors({});
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload proof.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Upload Error', 'Failed to select image. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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
              <Text style={styles.headerTitle}>Add Volunteer Hours</Text>
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
                    eventType === 'club' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => {
                    setEventType('club');
                    setSelectedEvent('');
                    setCustomEventName('');
                  }}
                >
                  <Icon 
                    name="event" 
                    size={moderateScale(18)} 
                    color={eventType === 'club' ? Colors.solidBlue : Colors.textMedium} 
                    style={styles.eventTypeIcon}
                  />
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'club' && styles.eventTypeTextActive
                  ]}>
                    Organization Event
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.eventTypeButton,
                    eventType === 'custom' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => {
                    setEventType('custom');
                    setSelectedEvent('');
                    setCustomEventName('');
                  }}
                >
                  <Icon 
                    name="add-circle-outline" 
                    size={moderateScale(18)} 
                    color={eventType === 'custom' ? Colors.solidBlue : Colors.textMedium} 
                    style={styles.eventTypeIcon}
                  />
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'custom' && styles.eventTypeTextActive
                  ]}>
                    Custom Activity
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Helper Text */}
              <Text style={styles.helperText}>
                {eventType === 'club' 
                  ? 'Select from organization events created by officers. This helps track participation in official activities.'
                  : 'Log volunteer work done outside of organization events. Describe the activity and organization you volunteered with.'
                }
              </Text>

              {/* Event Selector or Custom Input */}
              {eventType === 'club' ? (
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
                    emptyStateSubtitle="Contact your officers to create events, or select 'Custom Activity' to log other volunteer activities."
                    maxHeight={verticalScale(250)}
                  />
                  {errors.event && <Text style={styles.errorText}>{errors.event}</Text>}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Custom Activity Name</Text>
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
                <Text style={styles.inputLabel}>Proof of Volunteering</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Icon name="cloud-upload" size={moderateScale(24)} color={Colors.solidBlue} />
                  <Text style={styles.uploadButtonText}>
                    {selectedImage ? 'Photo Selected' : 'Upload a photo of your signature sheet or proof'}
                  </Text>
                </TouchableOpacity>
                {selectedImage && (
                  <Text style={styles.uploadSuccessText}>✓ Proof uploaded successfully</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitVolunteerHoursMutation.isPending && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitVolunteerHoursMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {submitVolunteerHoursMutation.isPending ? 'Submitting...' : 'Submit Hours'}
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
  uploadButton: {
    height: verticalScale(52),
    borderWidth: 2,
    borderColor: Colors.solidBlue,
    borderStyle: 'dashed',
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  uploadButtonText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginLeft: scale(8),
    textAlign: 'center',
  },
  uploadSuccessText: {
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