import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePickerExpo from 'expo-image-picker';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  solidBlue: '#2B5CE6',
  primaryBlue: '#4A90E2',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  lightGray: '#F7FAFC',
};

interface ReliableImagePickerProps {
  onImageSelected: (imageUri: string) => void;
  onImageRemoved: () => void;
  selectedImage?: string;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  error?: string;
  showSuccessIndicator?: boolean;
}

const ReliableImagePicker: React.FC<ReliableImagePickerProps> = ({
  onImageSelected,
  onImageRemoved,
  selectedImage,
  disabled = false,
  placeholder = 'Add Image',
  loading = false,
  error,
  showSuccessIndicator = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select images.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      Alert.alert('Permission Error', 'Unable to request photo library permissions.');
      return false;
    }
  };

  const showImagePicker = () => {
    if (disabled || loading || isProcessing) return;

    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        {
          text: 'Camera',
          onPress: openCamera
        },
        {
          text: 'Gallery',
          onPress: openGallery
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const openCamera = async () => {
    try {
      setIsProcessing(true);
      
      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false, // Show full image without cropping
        quality: 0.8,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ReliableImagePicker] Camera image selected:', result.assets[0].uri);
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ReliableImagePicker] Camera error:', error);
      Alert.alert('Camera Error', 'Unable to access camera. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openGallery = async () => {
    try {
      setIsProcessing(true);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false, // Show full image without cropping
        quality: 0.8,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ReliableImagePicker] Gallery image selected:', result.assets[0].uri);
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ReliableImagePicker] Gallery error:', error);
      Alert.alert('Gallery Error', 'Unable to access photo library. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onImageRemoved
        }
      ]
    );
  };

  if (selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.previewImage}
            resizeMode="cover"
            onLoad={() => {
              console.log('[ReliableImagePicker] ✅ Image loaded successfully:', selectedImage);
            }}
            onError={(error) => {
              console.log('[ReliableImagePicker] ❌ Image load error:', error.nativeEvent.error);
            }}
          />
          
          {(loading || isProcessing) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.loadingText}>
                {isProcessing ? 'Processing...' : 'Uploading...'}
              </Text>
            </View>
          )}
          
          {showSuccessIndicator && !loading && !isProcessing && (
            <View style={styles.successOverlay}>
              <Icon name="check-circle" size={moderateScale(32)} color={Colors.successGreen} />
              <Text style={styles.successText}>Image Ready</Text>
            </View>
          )}
          
          {!loading && !isProcessing && (
            <View style={styles.imageActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={showImagePicker}
                disabled={disabled}
              >
                <Icon name="edit" size={moderateScale(16)} color={Colors.white} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={handleRemoveImage}
                disabled={disabled}
              >
                <Icon name="close" size={moderateScale(16)} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          disabled && styles.pickerButtonDisabled,
          error && styles.pickerButtonError
        ]}
        onPress={showImagePicker}
        disabled={disabled || loading || isProcessing}
      >
        {(loading || isProcessing) ? (
          <ActivityIndicator size="small" color={Colors.textLight} />
        ) : (
          <Icon 
            name="add-a-photo" 
            size={moderateScale(24)} 
            color={disabled ? Colors.textLight : Colors.solidBlue} 
          />
        )}
        
        <Text style={[
          styles.placeholderText,
          disabled && styles.placeholderTextDisabled
        ]}>
          {isProcessing 
            ? 'Processing...' 
            : loading 
            ? 'Uploading...' 
            : placeholder}
        </Text>
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: verticalScale(8),
  },
  pickerButton: {
    height: verticalScale(80),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  pickerButtonDisabled: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.textLight,
  },
  pickerButtonError: {
    borderColor: Colors.errorRed,
    borderStyle: 'solid',
  },
  placeholderText: {
    fontSize: moderateScale(12),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginTop: verticalScale(6),
  },
  placeholderTextDisabled: {
    color: Colors.textLight,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: verticalScale(160), // Taller to show more of the image
    borderRadius: moderateScale(8),
    backgroundColor: Colors.lightGray,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: moderateScale(12),
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  imageActions: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(229, 62, 62, 0.8)',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(56, 161, 105, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: Colors.white,
    fontSize: moderateScale(12),
    marginTop: verticalScale(8),
    fontWeight: '600',
  },
  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
});

export default ReliableImagePicker;