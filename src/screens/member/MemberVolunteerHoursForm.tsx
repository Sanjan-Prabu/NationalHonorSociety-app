import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from 'components/ui/ToastProvider';
import ProfileButton from '../../components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabaseClient';

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
};

const MemberVolunteerHoursForm = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError, showValidationError } = useToast();
  const insets = useSafeAreaInsets();

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

  // Fetch events from database filtered by organizationId
  const [clubEvents, setClubEvents] = useState<{ label: string; value: string }[]>([]);
  
  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeOrganization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title')
          .eq('org_id', activeOrganization.id)
          .order('starts_at', { ascending: true });
          
        if (!error && data) {
          const eventOptions = data.map(event => ({
            label: event.title,
            value: event.id
          }));
          setClubEvents(eventOptions);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    
    fetchEvents();
  }, [activeOrganization]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Event validation
    if (eventType === 'club' && !selectedEvent) {
      newErrors.event = 'Please select an event';
    } else if (eventType === 'custom' && !customEventName.trim()) {
      newErrors.customEvent = 'Custom event name is required';
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

    if (!activeOrganization || !user) {
      showError('Error', 'Organization or user information is missing.');
      return;
    }

    // Prepare submission data
    const submissionData = {
      eventType,
      event: eventType === 'club' ? selectedEvent : customEventName,
      date,
      hours: parseFloat(hours),
      additionalNotes: additionalNotes.trim(),
      proofImage: selectedImage,
      organizationId: activeOrganization.id, // Include organization ID
      memberId: user.id, // Include member ID
    };

    console.log('Submitting hours for organization:', activeOrganization.name, submissionData);
    
    try {
      // Submit to database with organization filtering
      const { error } = await supabase
        .from('volunteer_hours')
        .insert({
          member_id: user.id,
          org_id: activeOrganization.id,
          activity_date: submissionData.date?.toISOString().split('T')[0], // Format as YYYY-MM-DD
          hours: submissionData.hours,
          description: `${submissionData.event} - ${submissionData.additionalNotes}`,
          approved: false,
          submitted_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error submitting volunteer hours:', error);
        showError('Submission Error', 'Failed to submit volunteer hours. Please try again.');
        return;
      }

      showSuccess('Hours Submitted', `Your volunteer hours have been submitted to ${activeOrganization.name} for review.`);
      
      // Reset form after successful submission
      resetForm();
    } catch (error) {
      console.error('Error submitting hours:', error);
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

  if (orgLoading) {
    return <LoadingScreen message="Loading form..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

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
            {/* Header with Back Button and Profile Button */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={moderateScale(24)} color={Colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Volunteer Hours</Text>
              <ProfileButton 
                color={Colors.solidBlue}
                size={moderateScale(28)}
              />
            </View>

            <Text style={styles.organizationText}>
              Submitting to: {activeOrganization.name}
            </Text>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Event Type Selection */}
              <Text style={styles.sectionTitle}>Event Information</Text>
              
              <View style={styles.eventTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.eventTypeButton,
                    eventType === 'club' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => setEventType('club')}
                >
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'club' && styles.eventTypeTextActive
                  ]}>
                    Club Event
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.eventTypeButton,
                    eventType === 'custom' && styles.eventTypeButtonActive
                  ]}
                  onPress={() => setEventType('custom')}
                >
                  <Text style={[
                    styles.eventTypeText,
                    eventType === 'custom' && styles.eventTypeTextActive
                  ]}>
                    Custom Event
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Event Selector or Custom Input */}
              {eventType === 'club' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Event Name</Text>
                  <View style={[styles.dropdownContainer, errors.event && styles.inputError]}>
                    <Text style={[
                      styles.dropdownText,
                      !selectedEvent && styles.dropdownPlaceholder
                    ]}>
                      {selectedEvent ? clubEvents.find(e => e.value === selectedEvent)?.label : 'Select an event'}
                    </Text>
                    <Icon name="arrow-drop-down" size={moderateScale(24)} color={Colors.textMedium} />
                  </View>
                  {errors.event && <Text style={styles.errorText}>{errors.event}</Text>}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Custom Event Name</Text>
                  <TextInput
                    style={[styles.textInput, errors.customEvent && styles.inputError]}
                    placeholder="Enter event name"
                    placeholderTextColor={Colors.textLight}
                    value={customEventName}
                    onChangeText={setCustomEventName}
                    maxLength={100}
                  />
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
                  <Text style={styles.uploadSuccessText}>
                    ✓ Proof uploaded successfully
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit Hours to {activeOrganization.name}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
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
    marginBottom: verticalScale(16),
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
  organizationText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: verticalScale(24),
    fontWeight: '500',
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
    borderRadius: moderateScale(6),
    alignItems: 'center',
  },
  eventTypeButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 2,
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
  dropdownContainer: {
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
  dropdownText: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
  },
  dropdownPlaceholder: {
    color: Colors.textLight,
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
    height: verticalScale(200),
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
});

export default MemberVolunteerHoursForm;