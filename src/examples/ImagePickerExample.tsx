import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import ImagePicker from '../components/ui/ImagePicker';
import ImageUploadService from '../services/ImageUploadService';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  solidBlue: '#2B5CE6',
  primaryBlue: '#4A90E2',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  lightGray: '#F7FAFC',
};

/**
 * Example component demonstrating ImagePicker usage for different scenarios
 * This shows how to integrate the ImagePicker with the ImageUploadService
 * for announcements, events, and volunteer hours
 */
const ImagePickerExample: React.FC = () => {
  // State for announcement image upload (public)
  const [announcementImage, setAnnouncementImage] = useState<string | undefined>();
  const [announcementUploading, setAnnouncementUploading] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | undefined>();

  // State for event image upload (public)
  const [eventImage, setEventImage] = useState<string | undefined>();
  const [eventUploading, setEventUploading] = useState(false);
  const [eventError, setEventError] = useState<string | undefined>();

  // State for volunteer hour image upload (private)
  const [volunteerImage, setVolunteerImage] = useState<string | undefined>();
  const [volunteerUploading, setVolunteerUploading] = useState(false);
  const [volunteerError, setVolunteerError] = useState<string | undefined>();

  const imageUploadService = ImageUploadService.getInstance();

  // Handle announcement image upload (public)
  const handleAnnouncementImageSelected = async (imageUri: string) => {
    setAnnouncementUploading(true);
    setAnnouncementError(undefined);

    try {
      // Upload to public bucket for announcements
      const publicUrl = await imageUploadService.uploadPublicImage(
        imageUri,
        'announcements',
        'nhs' // Example org ID
      );
      
      setAnnouncementImage(publicUrl);
      Alert.alert('Success', 'Announcement image uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setAnnouncementError(errorMessage);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setAnnouncementUploading(false);
    }
  };

  // Handle event image upload (public)
  const handleEventImageSelected = async (imageUri: string) => {
    setEventUploading(true);
    setEventError(undefined);

    try {
      // Upload to public bucket for events
      const publicUrl = await imageUploadService.uploadPublicImage(
        imageUri,
        'events',
        'nhs' // Example org ID
      );
      
      setEventImage(publicUrl);
      Alert.alert('Success', 'Event image uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setEventError(errorMessage);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setEventUploading(false);
    }
  };

  // Handle volunteer hour image upload (private)
  const handleVolunteerImageSelected = async (imageUri: string) => {
    setVolunteerUploading(true);
    setVolunteerError(undefined);

    try {
      // Upload to private bucket for volunteer hours
      const filePath = await imageUploadService.uploadPrivateImage(
        imageUri,
        'nhs', // Example org ID
        'user123' // Example user ID
      );
      
      setVolunteerImage(filePath);
      Alert.alert('Success', 'Volunteer hour proof image uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setVolunteerError(errorMessage);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setVolunteerUploading(false);
    }
  };

  // Handle validation errors
  const handleValidationError = (error: string) => {
    console.warn('Image validation error:', error);
  };

  // Reset functions
  const resetAnnouncementImage = () => {
    setAnnouncementImage(undefined);
    setAnnouncementError(undefined);
  };

  const resetEventImage = () => {
    setEventImage(undefined);
    setEventError(undefined);
  };

  const resetVolunteerImage = () => {
    setVolunteerImage(undefined);
    setVolunteerError(undefined);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ImagePicker Component Examples</Text>
      <Text style={styles.subtitle}>
        Demonstrating different use cases for the enhanced ImagePicker component
      </Text>

      {/* Announcement Image Upload Example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcement Image (Public)</Text>
        <Text style={styles.sectionDescription}>
          Images uploaded for announcements are stored in a public bucket and accessible via direct URLs.
        </Text>
        
        <ImagePicker
          onImageSelected={handleAnnouncementImageSelected}
          onImageRemoved={resetAnnouncementImage}
          onValidationError={handleValidationError}
          selectedImage={announcementImage}
          loading={announcementUploading}
          error={announcementError}
          placeholder="Add Announcement Image"
          showSuccessIndicator={true}
        />

        {announcementImage && (
          <Text style={styles.resultText}>
            ✅ Public URL: {announcementImage}
          </Text>
        )}
      </View>

      {/* Event Image Upload Example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Image (Public)</Text>
        <Text style={styles.sectionDescription}>
          Event images are also stored publicly for easy sharing and display.
        </Text>
        
        <ImagePicker
          onImageSelected={handleEventImageSelected}
          onImageRemoved={resetEventImage}
          onValidationError={handleValidationError}
          selectedImage={eventImage}
          loading={eventUploading}
          error={eventError}
          placeholder="Add Event Image"
          showSuccessIndicator={true}
        />

        {eventImage && (
          <Text style={styles.resultText}>
            ✅ Public URL: {eventImage}
          </Text>
        )}
      </View>

      {/* Volunteer Hour Image Upload Example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Volunteer Hour Proof (Private)</Text>
        <Text style={styles.sectionDescription}>
          Volunteer hour proof images are stored privately and require presigned URLs for access.
        </Text>
        
        <ImagePicker
          onImageSelected={handleVolunteerImageSelected}
          onImageRemoved={resetVolunteerImage}
          onValidationError={handleValidationError}
          selectedImage={volunteerImage}
          loading={volunteerUploading}
          error={volunteerError}
          placeholder="Add Proof Image"
          showSuccessIndicator={true}
        />

        {volunteerImage && (
          <Text style={styles.resultText}>
            ✅ File Path: {volunteerImage}
          </Text>
        )}
      </View>

      {/* Configuration Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration Status</Text>
        <TouchableOpacity
          style={styles.checkButton}
          onPress={() => {
            const isConfigured = imageUploadService.isConfigured();
            Alert.alert(
              'Configuration Status',
              isConfigured 
                ? 'R2 configuration is valid and ready for uploads'
                : 'R2 configuration is missing or invalid. Please check environment variables.'
            );
          }}
        >
          <Text style={styles.checkButtonText}>Check R2 Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enhanced Features</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✅ Camera and gallery selection options</Text>
          <Text style={styles.featureItem}>✅ Image preview with edit/remove actions</Text>
          <Text style={styles.featureItem}>✅ Upload progress indicators</Text>
          <Text style={styles.featureItem}>✅ Success confirmation feedback</Text>
          <Text style={styles.featureItem}>✅ Comprehensive error handling</Text>
          <Text style={styles.featureItem}>✅ Image validation (size, format, corruption)</Text>
          <Text style={styles.featureItem}>✅ Integration with ImageUploadService</Text>
          <Text style={styles.featureItem}>✅ Support for public and private uploads</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: scale(16),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(24),
  },
  section: {
    marginBottom: verticalScale(32),
    padding: scale(16),
    backgroundColor: Colors.inputBackground,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  sectionDescription: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginBottom: verticalScale(16),
  },
  resultText: {
    fontSize: moderateScale(12),
    color: Colors.successGreen,
    marginTop: verticalScale(8),
    fontFamily: 'monospace',
  },
  checkButton: {
    backgroundColor: Colors.primaryBlue,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  checkButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  featureList: {
    gap: verticalScale(8),
  },
  featureItem: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
  },
});

export default ImagePickerExample;