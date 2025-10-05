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
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from 'components/ui/ToastProvider';

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

type EventCategory = 'Community Service' | 'Education' | 'Environment' | 'Fundraising' | 'Volunteer';

const CreateEventScreen = ({ navigation }: any) => {
  const { showSuccess, showError, showValidationError } = useToast();
  const insets = useSafeAreaInsets();

  // Form state
  const [eventName, setEventName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Category options with their tag variants
  const categoryOptions: { label: EventCategory; variant: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' }[] = [
    { label: 'Volunteer', variant: 'teal' },
    { label: 'Education', variant: 'purple' },
    { label: 'Environment', variant: 'green' },
    { label: 'Fundraising', variant: 'orange' },
    { label: 'Community Service', variant: 'blue' },
  ];

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      showValidationError('Validation Error', 'Please fill out all required fields correctly.');
      return;
    }

    // Prepare submission data
    const submissionData = {
      title: eventName.trim(),
      category: selectedCategory,
      date,
      startTime: startTime ? formatTime(startTime) : '',
      endTime: endTime ? formatTime(endTime) : '',
      location: location.trim(),
      description: description.trim(),
      image: selectedImage,
    };

    console.log('Creating event:', submissionData);
    
    // Here you would typically make an API call to create the event
    showSuccess('Event Created', 'Your event has been created successfully.');
    navigation.goBack();
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
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
        showSuccess('Image Added', 'Event image uploaded successfully.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Upload Error', 'Failed to select image. Please try again.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
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
                  {categoryOptions.map((category, index) => (
                    <TouchableOpacity
                      key={category.label}
                      style={[
                        styles.categoryButton,
                        index === categoryOptions.length - 1 && styles.categoryButtonLast,
                        selectedCategory === category.label && styles.categoryButtonActive
                      ]}
                      onPress={() => setSelectedCategory(category.label)}
                    >
                      <Text 
                        style={[
                          styles.categoryText,
                          selectedCategory === category.label && styles.categoryTextActive
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
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

              {/* Event Image or Flyer */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Event Image or Flyer</Text>
                
                {selectedImage ? (
                  <View style={styles.selectedImageContainer}>
                    <View style={styles.imagePreview}>
                      <Icon name="image" size={moderateScale(40)} color={Colors.textMedium} />
                      <Text style={styles.imagePreviewText}>Image Selected</Text>
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={removeImage}
                      >
                        <Icon name="close" size={moderateScale(20)} color={Colors.errorRed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Icon name="cloud-upload" size={moderateScale(24)} color={Colors.solidBlue} />
                    <Text style={styles.uploadButtonText}>
                      Upload event image or flyer
                    </Text>
                    <Text style={styles.uploadSubtext}>
                      PNG, JPG, PDF up to 10MB
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Create Event Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Create Event</Text>
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
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  categoryButtonLast: {
    flexBasis: '100%',
    alignSelf: 'center',
    width: '60%',
  },
  categoryButtonActive: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.solidBlue,
  },
  categoryText: {
    fontSize: moderateScale(13),
    color: Colors.textMedium,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: Colors.solidBlue,
    fontWeight: '600',
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
  uploadButton: {
    height: verticalScale(120),
    borderWidth: 2,
    borderColor: Colors.solidBlue,
    borderStyle: 'dashed',
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  uploadButtonText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  selectedImageContainer: {
    marginTop: verticalScale(8),
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: moderateScale(8),
    padding: scale(16),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  imagePreviewText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(12),
  },
  removeImageButton: {
    padding: scale(4),
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
});

export default CreateEventScreen;