import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usePresignedUrl } from '../../hooks/usePresignedUrl';

// Simple in-memory cache for presigned URLs
const urlCache = new Map<string, { url: string; expiresAt: number }>();

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
  modalBackground: 'rgba(0, 0, 0, 0.9)',
};

interface SecureImageViewerProps {
  imagePath?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
  testID?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * SecureImageViewer component for displaying private images using presigned URLs
 * Shows a placeholder button that generates presigned URLs on demand
 */
const SecureImageViewer: React.FC<SecureImageViewerProps> = ({
  imagePath,
  placeholder = 'Click here to view image',
  disabled = false,
  style,
  testID
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const { generateUrl, loading: urlLoading, error } = usePresignedUrl();

  /**
   * Check if we have a valid cached URL
   */
  const getCachedUrl = useCallback((path: string): string | null => {
    const cached = urlCache.get(path);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('[SecureImageViewer] Using cached URL for:', path);
      return cached.url;
    }
    if (cached) {
      console.log('[SecureImageViewer] Cached URL expired for:', path);
      urlCache.delete(path);
    }
    return null;
  }, []);

  /**
   * Cache a presigned URL with expiration
   */
  const cacheUrl = useCallback((path: string, url: string) => {
    // Cache for 50 minutes (presigned URLs expire in 1 hour)
    const expiresAt = Date.now() + (50 * 60 * 1000);
    urlCache.set(path, { url, expiresAt });
    console.log('[SecureImageViewer] Cached URL for:', path);
  }, []);

  /**
   * Handle image view request - generates presigned URL and shows modal
   */
  const handleViewImage = useCallback(async () => {
    if (!imagePath || disabled) return;

    console.log('[SecureImageViewer] Requesting image view for:', imagePath);

    // Check cache first
    const cachedUrl = getCachedUrl(imagePath);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      setModalVisible(true);
      return;
    }

    try {
      setImageLoading(true);
      console.log('[SecureImageViewer] Generating new presigned URL...');
      
      // Add timeout to presigned URL generation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - taking too long to generate URL')), 15000);
      });
      
      const url = await Promise.race([
        generateUrl(imagePath),
        timeoutPromise
      ]);
      
      console.log('[SecureImageViewer] ✅ Presigned URL generated successfully');
      
      // Cache the URL
      cacheUrl(imagePath, url);
      
      setImageUrl(url);
      setModalVisible(true);
    } catch (error) {
      console.error('[SecureImageViewer] ❌ Failed to load image:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load image';
      
      // Show user-friendly error messages
      if (errorMessage.includes('timeout') || errorMessage.includes('taking too long')) {
        Alert.alert(
          'Request Timeout',
          'The image is taking too long to load. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        Alert.alert(
          'Access Denied',
          "You don't have permission to view this image.",
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        Alert.alert(
          'Image Not Found',
          'The requested image could not be found.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Unable to Load Image',
          'There was an error loading the image. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setImageLoading(false);
    }
  }, [imagePath, disabled, generateUrl, getCachedUrl, cacheUrl]);

  /**
   * Close modal and clear image URL
   */
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setImageUrl(null);
  }, []);

  /**
   * Handle image load error in modal
   */
  const handleImageError = useCallback(() => {
    Alert.alert(
      'Image Load Error',
      'Failed to display the image. It may have expired or been moved.',
      [
        {
          text: 'Try Again',
          onPress: () => {
            setImageUrl(null);
            handleViewImage();
          }
        },
        {
          text: 'Close',
          onPress: handleCloseModal
        }
      ]
    );
  }, [handleViewImage, handleCloseModal]);

  // Don't render anything if no image path
  if (!imagePath) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.placeholderButton,
          disabled && styles.placeholderButtonDisabled,
          style
        ]}
        onPress={handleViewImage}
        disabled={disabled || urlLoading || imageLoading}
        testID={testID}
      >
        {(urlLoading || imageLoading) ? (
          <ActivityIndicator size="small" color={Colors.primaryBlue} />
        ) : (
          <Icon 
            name="visibility" 
            size={moderateScale(20)} 
            color={disabled ? Colors.textLight : Colors.primaryBlue} 
          />
        )}
        
        <Text style={[
          styles.placeholderText,
          disabled && styles.placeholderTextDisabled
        ]}>
          {(urlLoading || imageLoading) ? 'Loading...' : placeholder}
        </Text>
        
        {!disabled && !urlLoading && !imageLoading && (
          <Icon 
            name="open-in-new" 
            size={moderateScale(16)} 
            color={Colors.textLight} 
          />
        )}
      </TouchableOpacity>

      {/* Full-screen image modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseModal}
            testID="close-image-modal"
          >
            <Icon name="close" size={moderateScale(24)} color={Colors.white} />
          </TouchableOpacity>

          {/* Image container */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullScreenImage}
                resizeMode="contain"
                onError={handleImageError}
                testID="secure-image"
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
          </View>

          {/* Image info */}
          <View style={styles.imageInfo}>
            <Text style={styles.imageInfoText}>
              Tap outside to close
            </Text>
          </View>
        </View>
      </Modal>

      {/* Error display */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  placeholderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    minHeight: verticalScale(44),
  },
  placeholderButtonDisabled: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.textLight,
  },
  placeholderText: {
    fontSize: moderateScale(14),
    color: Colors.primaryBlue,
    fontWeight: '500',
    marginHorizontal: scale(8),
    flex: 1,
    textAlign: 'center',
  },
  placeholderTextDisabled: {
    color: Colors.textLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.modalBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: verticalScale(50),
    right: scale(20),
    zIndex: 1000,
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(80),
  },
  fullScreenImage: {
    width: screenWidth - scale(40),
    height: screenHeight - verticalScale(160),
    maxWidth: screenWidth - scale(40),
    maxHeight: screenHeight - verticalScale(160),
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    marginTop: verticalScale(16),
    fontWeight: '500',
  },
  imageInfo: {
    position: 'absolute',
    bottom: verticalScale(40),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageInfoText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    opacity: 0.8,
  },
  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
});

export default SecureImageViewer;