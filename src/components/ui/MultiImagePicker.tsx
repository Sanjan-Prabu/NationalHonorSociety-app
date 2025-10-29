import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
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

interface ImageData {
  id: string;
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  uploadedUrl?: string;
  error?: string;
}

interface MultiImagePickerProps {
  onImagesSelected: (imageUrls: string[]) => void;
  onImageUploaded: (imageUri: string, uploadedUrl: string) => void;
  onImageRemoved: (imageUri: string) => void;
  selectedImages?: string[];
  disabled?: boolean;
  maxImages?: number;
  placeholder?: string;
  loading?: boolean;
  error?: string;
}

const MultiImagePicker: React.FC<MultiImagePickerProps> = ({
  onImagesSelected,
  onImageUploaded,
  onImageRemoved,
  selectedImages = [],
  disabled = false,
  maxImages = 3,
  placeholder = 'Add Images',
  loading = false,
  error,
}) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select images. Please grant permission in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      Alert.alert('Permission Error', 'Unable to request photo library permissions. Please try again.');
      return false;
    }
  };

  const showImagePicker = () => {
    if (disabled || loading || images.length >= maxImages) return;

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
      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'We need camera permissions to take photos.');
        return;
      }

      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false, // Don't crop the image, show full image
        quality: 0.8,
        exif: false,
        base64: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Camera Error', 'Unable to access camera. Please try again.');
    }
  };

  const openGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: false, // Don't crop the image, show full image
        quality: 0.8,
        exif: false,
        allowsMultipleSelection: false,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Gallery Error', 'Unable to access photo library. Please try again.');
    }
  };

  const addImage = (imageUri: string) => {
    const newImage: ImageData = {
      id: Date.now().toString(),
      uri: imageUri,
      uploading: false,
      uploaded: false,
    };

    setImages(prev => [...prev, newImage]);
    
    // Trigger upload immediately
    uploadImage(newImage.id, imageUri);
  };

  const uploadImage = async (imageId: string, imageUri: string) => {
    // Mark as uploading
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, uploading: true, error: undefined } : img
    ));
    setUploadingCount(prev => prev + 1);

    try {
      // Call the parent's upload handler
      onImageUploaded(imageUri, imageUri); // For now, use the same URI
      
      // Mark as uploaded
      setImages(prev => prev.map(img => 
        img.id === imageId ? { 
          ...img, 
          uploading: false, 
          uploaded: true, 
          uploadedUrl: imageUri 
        } : img
      ));

      // Update parent with all uploaded URLs
      const updatedImages = images.map(img => 
        img.id === imageId ? { ...img, uploaded: true, uploadedUrl: imageUri } : img
      );
      const uploadedUrls = updatedImages
        .filter(img => img.uploaded && img.uploadedUrl)
        .map(img => img.uploadedUrl!);
      
      onImagesSelected(uploadedUrls);

    } catch (error) {
      // Mark as error
      setImages(prev => prev.map(img => 
        img.id === imageId ? { 
          ...img, 
          uploading: false, 
          error: 'Upload failed' 
        } : img
      ));
    } finally {
      setUploadingCount(prev => prev - 1);
    }
  };

  const removeImage = (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;

    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImages(prev => prev.filter(img => img.id !== imageId));
            
            if (imageToRemove.uploadedUrl) {
              onImageRemoved(imageToRemove.uploadedUrl);
            }

            // Update parent with remaining uploaded URLs
            const remainingImages = images.filter(img => img.id !== imageId);
            const uploadedUrls = remainingImages
              .filter(img => img.uploaded && img.uploadedUrl)
              .map(img => img.uploadedUrl!);
            
            onImagesSelected(uploadedUrls);
          }
        }
      ]
    );
  };

  const canAddMore = images.length < maxImages && !disabled && !loading;

  return (
    <View style={styles.container}>
      {/* Images Grid */}
      {images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {images.map((image) => (
            <View key={image.id} style={styles.imageItem}>
              <Image 
                source={{ uri: image.uri }} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
              
              {/* Loading Overlay */}
              {image.uploading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.loadingText}>Uploading...</Text>
                </View>
              )}

              {/* Success Indicator */}
              {image.uploaded && !image.uploading && (
                <View style={styles.successIndicator}>
                  <Icon name="check-circle" size={moderateScale(16)} color={Colors.successGreen} />
                </View>
              )}

              {/* Error Indicator */}
              {image.error && !image.uploading && (
                <View style={styles.errorIndicator}>
                  <Icon name="error" size={moderateScale(16)} color={Colors.errorRed} />
                </View>
              )}

              {/* Remove Button */}
              {!image.uploading && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(image.id)}
                >
                  <Icon name="close" size={moderateScale(14)} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[
            styles.addButton,
            images.length === 0 && styles.addButtonLarge,
            error && styles.addButtonError
          ]}
          onPress={showImagePicker}
          disabled={!canAddMore}
        >
          <Icon 
            name="add-a-photo" 
            size={moderateScale(images.length === 0 ? 24 : 20)} 
            color={Colors.solidBlue} 
          />
          <Text style={styles.addButtonText}>
            {images.length === 0 
              ? placeholder 
              : `Add Image (${images.length}/${maxImages})`
            }
          </Text>
        </TouchableOpacity>
      )}

      {/* Status Text */}
      {images.length >= maxImages && (
        <Text style={styles.maxReachedText}>
          Maximum {maxImages} images selected
        </Text>
      )}

      {/* Upload Progress */}
      {uploadingCount > 0 && (
        <Text style={styles.uploadingText}>
          Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}...
        </Text>
      )}

      {/* Error Text */}
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
  imagesContainer: {
    marginBottom: verticalScale(12),
  },
  imagesContent: {
    paddingRight: scale(16),
  },
  imageItem: {
    position: 'relative',
    marginRight: scale(12),
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  imagePreview: {
    width: scale(100),
    height: verticalScale(80),
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
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
  successIndicator: {
    position: 'absolute',
    top: scale(4),
    left: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: moderateScale(12),
    padding: scale(2),
  },
  errorIndicator: {
    position: 'absolute',
    top: scale(4),
    left: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: moderateScale(12),
    padding: scale(2),
  },
  removeButton: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: 'rgba(229, 62, 62, 0.8)',
    borderRadius: moderateScale(12),
    padding: scale(4),
  },
  addButton: {
    height: verticalScale(60),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  addButtonLarge: {
    height: verticalScale(80),
    flexDirection: 'column',
  },
  addButtonError: {
    borderColor: Colors.errorRed,
    borderStyle: 'solid',
  },
  addButtonText: {
    fontSize: moderateScale(12),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginLeft: scale(8),
  },
  maxReachedText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    textAlign: 'center',
    marginTop: verticalScale(8),
    fontStyle: 'italic',
  },
  uploadingText: {
    fontSize: moderateScale(12),
    color: Colors.primaryBlue,
    textAlign: 'center',
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
});

export default MultiImagePicker;