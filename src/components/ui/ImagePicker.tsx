import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePickerExpo from 'expo-image-picker';
import ImageUploadService, { ValidationResult } from '../../services/ImageUploadService';
import { useNetworkConnectivity } from '../../hooks/useNetworkConnectivity';
import { 
  formatErrorMessage, 
  logImageUploadError,
  createUserFriendlyError,
  ErrorSeverity
} from '../../utils/imageUploadErrorHandler';
import UploadProgressIndicator from './UploadProgressIndicator';
import LazyImage from './LazyImage';

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

interface ImagePickerProps {
  onImageSelected: (imageUri: string) => void;
  onImageRemoved: () => void;
  onValidationError?: (error: string) => void;
  onNetworkError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  selectedImage?: string;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  error?: string;
  showSuccessIndicator?: boolean;
  enableNetworkCheck?: boolean;
  maxRetries?: number;
  showProgressIndicator?: boolean;
  enableLazyLoading?: boolean;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelected,
  onImageRemoved,
  onValidationError,
  onNetworkError,
  onUploadProgress,
  selectedImage,
  disabled = false,
  placeholder = 'Add Image',
  loading = false,
  error,
  showSuccessIndicator = false,
  enableNetworkCheck = true,
  maxRetries = 3,
  showProgressIndicator = true,
  enableLazyLoading = true,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  
  const imageUploadService = ImageUploadService.getInstance();
  const { isOnline, isOffline, executeRequest } = useNetworkConnectivity();

  // Monitor network status
  useEffect(() => {
    if (enableNetworkCheck) {
      if (isOffline) {
        setNetworkStatus('No internet connection');
        if (onNetworkError) {
          onNetworkError('No internet connection. Please check your network and try again.');
        }
      } else if (isOnline) {
        setNetworkStatus(null);
      }
    }
  }, [isOnline, isOffline, enableNetworkCheck, onNetworkError]);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select images. Please grant permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real app, you might want to open device settings
              console.log('Open device settings for permissions');
            }}
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      logImageUploadError(error, { operation: 'requestPermissions' });
      Alert.alert(
        'Permission Error',
        'Unable to request photo library permissions. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const validateSelectedImage = useCallback(async (imageUri: string, attempt: number = 1): Promise<boolean> => {
    setIsValidating(true);
    setValidationSuccess(false);
    setUploadStatus('processing');
    setUploadProgress(0);
    
    try {
      // Check network connectivity before validation if enabled
      if (enableNetworkCheck && isOffline) {
        const errorMessage = 'No internet connection. Please check your network and try again.';
        if (onNetworkError) {
          onNetworkError(errorMessage);
        }
        Alert.alert('Network Error', errorMessage, [{ text: 'OK' }]);
        setUploadStatus('error');
        return false;
      }

      // Simulate progress for validation
      setUploadProgress(25);

      // Execute validation with network awareness
      const validation: ValidationResult = enableNetworkCheck 
        ? await executeRequest(
            () => imageUploadService.validateImage(imageUri),
            { 
              queueIfOffline: false, 
              maxRetries: 1,
              context: 'image_validation'
            }
          )
        : await imageUploadService.validateImage(imageUri);
      
      setUploadProgress(75);
      
      if (!validation.valid) {
        const errorMessage = validation.error || 'Image validation failed';
        logImageUploadError(new Error(errorMessage), { 
          operation: 'validateImage', 
          imageUri: imageUri.substring(0, 50) + '...',
          attempt 
        });
        
        if (onValidationError) {
          onValidationError(errorMessage);
        }
        
        Alert.alert('Invalid Image', errorMessage, [{ text: 'OK' }]);
        setUploadStatus('error');
        return false;
      }
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Show success indicator briefly
      if (showSuccessIndicator) {
        setValidationSuccess(true);
        setTimeout(() => {
          setValidationSuccess(false);
          setUploadStatus('idle');
        }, 2000);
      } else {
        setTimeout(() => setUploadStatus('idle'), 1000);
      }
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Report progress to parent
      if (onUploadProgress) {
        onUploadProgress(100);
      }
      
      return true;
      
    } catch (error) {
      logImageUploadError(error, { 
        operation: 'validateImage', 
        imageUri: imageUri.substring(0, 50) + '...',
        attempt,
        maxRetries
      });
      
      const errorInfo = createUserFriendlyError(error);
      
      // Handle retryable errors
      if (errorInfo.canRetry && attempt < maxRetries) {
        const nextAttempt = attempt + 1;
        setRetryCount(nextAttempt);
        
        Alert.alert(
          'Validation Error',
          `${errorInfo.message} Retrying... (${nextAttempt}/${maxRetries})`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry Now', 
              onPress: async () => {
                // Wait for suggested delay before retry
                if (errorInfo.retryDelay) {
                  await new Promise(resolve => setTimeout(resolve, errorInfo.retryDelay));
                }
                return validateSelectedImage(imageUri, nextAttempt);
              }
            }
          ]
        );
        return false;
      }
      
      // Handle non-retryable errors or max retries reached
      const errorMessage = formatErrorMessage(error, true);
      
      if (onValidationError) {
        onValidationError(errorMessage);
      }
      
      setUploadStatus('error');
      
      if (errorInfo.severity === ErrorSeverity.CRITICAL) {
        Alert.alert(
          'Critical Error',
          `${errorMessage}\n\nIf this problem persists, please contact support.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Validation Error',
          errorMessage,
          [
            { text: 'OK' },
            ...(errorInfo.actionSuggestions.length > 0 ? [{
              text: 'Help',
              onPress: () => {
                Alert.alert(
                  'Troubleshooting',
                  errorInfo.actionSuggestions.join('\n• '),
                  [{ text: 'OK' }]
                );
              }
            }] : [])
          ]
        );
      }
      
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [
    imageUploadService, 
    onValidationError, 
    onNetworkError,
    showSuccessIndicator, 
    enableNetworkCheck, 
    isOffline, 
    executeRequest,
    maxRetries
  ]);

  const showImagePicker = () => {
    if (disabled || loading || isValidating) return;

    // Check network status before showing picker
    if (enableNetworkCheck && isOffline) {
      Alert.alert(
        'No Internet Connection',
        'You need an internet connection to upload images. Please check your network and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

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
      // Request camera permissions with enhanced error handling
      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'We need camera permissions to take photos. Please grant permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real app, you might want to open device settings
              console.log('Open device settings for camera permissions');
            }}
          ]
        );
        return;
      }

      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false, // Don't include EXIF data for privacy
        base64: false, // Don't include base64 to reduce memory usage
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const isValid = await validateSelectedImage(imageUri);
        if (isValid) {
          onImageSelected(imageUri);
        }
      }
    } catch (error) {
      logImageUploadError(error, { operation: 'openCamera' });
      
      const errorInfo = createUserFriendlyError(error);
      Alert.alert(
        'Camera Error', 
        errorInfo.message,
        [
          { text: 'OK' },
          ...(errorInfo.actionSuggestions.length > 0 ? [{
            text: 'Help',
            onPress: () => {
              Alert.alert(
                'Troubleshooting',
                errorInfo.actionSuggestions.join('\n• '),
                [{ text: 'OK' }]
              );
            }
          }] : [])
        ]
      );
    }
  };

  const openGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false, // Don't include EXIF data for privacy
        allowsMultipleSelection: false, // Ensure single selection
        base64: false, // Don't include base64 to reduce memory usage
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const isValid = await validateSelectedImage(imageUri);
        if (isValid) {
          onImageSelected(imageUri);
        }
      }
    } catch (error) {
      logImageUploadError(error, { operation: 'openGallery' });
      
      const errorInfo = createUserFriendlyError(error);
      Alert.alert(
        'Gallery Error', 
        errorInfo.message,
        [
          { text: 'OK' },
          ...(errorInfo.actionSuggestions.length > 0 ? [{
            text: 'Help',
            onPress: () => {
              Alert.alert(
                'Troubleshooting',
                errorInfo.actionSuggestions.join('\n• '),
                [{ text: 'OK' }]
              );
            }
          }] : [])
        ]
      );
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
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
        {/* Progress Indicator */}
        {showProgressIndicator && uploadStatus !== 'idle' && (
          <UploadProgressIndicator
            progress={uploadProgress}
            status={uploadStatus}
            size="medium"
            style={styles.progressIndicator}
          />
        )}
        
        <View style={styles.imageContainer}>
          {enableLazyLoading ? (
            <LazyImage
              source={{ uri: selectedImage }}
              containerStyle={styles.previewImage}
              imageStyle={styles.previewImage}
              enableFadeIn={true}
              fadeInDuration={300}
            />
          ) : (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.previewImage}
              testID="preview-image"
            />
          )}
          
          {(loading || isValidating) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.loadingText}>
                {isValidating ? 'Validating...' : 'Uploading...'}
              </Text>
            </View>
          )}
          
          {validationSuccess && !loading && !isValidating && (
            <View style={styles.successOverlay}>
              <Icon name="check-circle" size={moderateScale(32)} color={Colors.successGreen} />
              <Text style={styles.successText}>Valid Image</Text>
            </View>
          )}
          
          {!loading && !isValidating && !validationSuccess && (
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
                testID="remove-button"
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
        disabled={disabled || loading || isValidating}
        testID="picker-button"
      >
        {(loading || isValidating) ? (
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
          {isValidating 
            ? `Validating...${retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''}` 
            : loading 
            ? 'Processing...' 
            : networkStatus 
            ? networkStatus 
            : placeholder}
        </Text>
      </TouchableOpacity>
      
      {(error || networkStatus) && (
        <Text style={[
          styles.errorText,
          networkStatus && !error && styles.networkStatusText
        ]}>
          {error || networkStatus}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: verticalScale(8),
  },
  progressIndicator: {
    marginBottom: verticalScale(8),
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
    height: verticalScale(120),
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
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: Colors.successGreen,
    fontSize: moderateScale(12),
    marginTop: verticalScale(8),
    fontWeight: '600',
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
  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
  networkStatusText: {
    color: Colors.textMedium,
    fontStyle: 'italic',
  },
});

export default ImagePicker;