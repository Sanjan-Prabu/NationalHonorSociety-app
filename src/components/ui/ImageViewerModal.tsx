import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Colors = {
  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.9)',
  textLight: '#718096',
  primaryBlue: '#4A90E2',
};

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  title?: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
  title,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    setImageSize({ width, height });
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    console.log('❌ ImageViewerModal: Image failed to load:', imageUrl);
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    console.log('🔄 ImageViewerModal: Retrying image load');
    setHasError(false);
    setIsLoading(true);
    setImageSize(null);
  };

  const calculateImageDimensions = () => {
    if (!imageSize) return { width: screenWidth, height: screenHeight * 0.7 };

    const { width: imgWidth, height: imgHeight } = imageSize;
    const aspectRatio = imgWidth / imgHeight;

    // Calculate dimensions to fit screen while maintaining aspect ratio
    let displayWidth = screenWidth - scale(40); // Padding
    let displayHeight = displayWidth / aspectRatio;

    // If height is too large, scale down based on height
    const maxHeight = screenHeight * 0.8;
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = displayHeight * aspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  };

  const { width: displayWidth, height: displayHeight } = calculateImageDimensions();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={moderateScale(28)} color={Colors.white} />
            </TouchableOpacity>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            <View style={styles.headerSpacer} />
          </View>

          {/* Image Container */}
          <TouchableOpacity 
            style={styles.imageContainer} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}

            {hasError && (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.errorText}>Failed to load image</Text>
                <Text style={styles.errorSubtext}>Check your internet connection and try again</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <Icon name="refresh" size={moderateScale(16)} color={Colors.white} />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!hasError && (
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.image,
                  {
                    width: displayWidth,
                    height: displayHeight,
                  },
                ]}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </TouchableOpacity>

          {/* Footer with image info */}
          {imageSize && !isLoading && !hasError && (
            <View style={styles.footer}>
              <Text style={styles.imageInfo}>
                {imageSize.width} × {imageSize.height}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    zIndex: 1,
  },
  closeButton: {
    padding: scale(8),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: scale(44),
    minHeight: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: moderateScale(18),
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: scale(16),
  },
  headerSpacer: {
    width: scale(44), // Same width as close button
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  image: {
    borderRadius: moderateScale(8),
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    marginTop: verticalScale(12),
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  errorText: {
    color: Colors.textLight,
    fontSize: moderateScale(16),
    textAlign: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    fontWeight: '600',
  },
  errorSubtext: {
    color: Colors.textLight,
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginBottom: verticalScale(20),
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: Colors.primaryBlue,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primaryBlue,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 4,
  },
  retryText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  footer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
  },
  imageInfo: {
    color: Colors.textLight,
    fontSize: moderateScale(12),
  },
});

export default ImageViewerModal;