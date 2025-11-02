import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  white: '#FFFFFF',
  lightGray: '#F7FAFC',
  textLight: '#718096',
  textMedium: '#4A5568',
  primaryBlue: '#4A90E2',
  errorRed: '#E53E3E',
};

interface RobustImageProps {
  imageUrl: string;
  style?: any;
  containerStyle?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  fallbackText?: string;
  showRetryButton?: boolean;
}

/**
 * RobustImage component that handles multiple URL formats and provides fallbacks
 * Specifically designed to handle R2 image loading issues
 */
const RobustImage: React.FC<RobustImageProps> = ({
  imageUrl,
  style,
  containerStyle,
  resizeMode = 'cover',
  onPress,
  fallbackText = 'Image',
  showRetryButton = true,
}) => {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Generate multiple URL formats to try
  const generateUrlVariants = useCallback((originalUrl: string): string[] => {
    const variants: string[] = [originalUrl];

    // If it's a pub- URL, try the direct R2 URL as fallback
    if (originalUrl.includes('pub-') && originalUrl.includes('.r2.dev')) {
      // Extract the path after the domain
      const urlParts = originalUrl.split('.r2.dev/');
      if (urlParts.length > 1) {
        const path = urlParts[1];
        // Create direct R2 URL
        const directUrl = `https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/${path}`;
        variants.push(directUrl);
      }
    }

    // If it's a direct R2 URL, try the pub- URL as fallback
    if (originalUrl.includes('r2.cloudflarestorage.com')) {
      const pathMatch = originalUrl.match(/nhs-app-public-dev\/(.+)$/);
      if (pathMatch) {
        const path = pathMatch[1];
        const pubUrl = `https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/${path}`;
        variants.push(pubUrl);
      }
    }

    return variants;
  }, []);

  const urlVariants = generateUrlVariants(imageUrl);
  const currentUrl = urlVariants[currentUrlIndex] || imageUrl;

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
  }, []);

  const handleError = useCallback(() => {
    console.log(`[RobustImage] Error loading image: ${currentUrl}`);
    
    // Try next URL variant
    if (currentUrlIndex < urlVariants.length - 1) {
      console.log(`[RobustImage] Trying next URL variant: ${urlVariants[currentUrlIndex + 1]}`);
      setCurrentUrlIndex(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
      return;
    }

    // All variants failed, try retry with exponential backoff
    if (retryCount < maxRetries) {
      console.log(`[RobustImage] Retrying (${retryCount + 1}/${maxRetries}) after delay`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setCurrentUrlIndex(0); // Start from first variant again
        setIsLoading(true);
        setHasError(false);
      }, Math.pow(2, retryCount) * 1000);
    } else {
      console.log(`[RobustImage] All attempts failed for: ${imageUrl}`);
      setIsLoading(false);
      setHasError(true);
    }
  }, [currentUrl, currentUrlIndex, urlVariants, retryCount, maxRetries, imageUrl]);

  const handleRetry = useCallback(() => {
    setCurrentUrlIndex(0);
    setRetryCount(0);
    setIsLoading(true);
    setHasError(false);
  }, []);

  const renderContent = () => {
    if (hasError) {
      return (
        <View style={[styles.fallbackContainer, style]}>
          <View style={styles.fallbackContent}>
            <Icon name="broken-image" size={moderateScale(32)} color={Colors.textMedium} />
            <Text style={styles.fallbackText}>{fallbackText}</Text>
            <Text style={styles.errorText}>Failed to load image</Text>
            {showRetryButton && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Icon name="refresh" size={moderateScale(16)} color={Colors.white} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.imageContainer, containerStyle]}>
        <Image
          source={{ uri: currentUrl }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          // Force reload on URL change
          key={`${currentUrl}-${retryCount}`}
        />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={Colors.primaryBlue} />
            {retryCount > 0 && (
              <Text style={styles.loadingText}>
                Retrying... ({retryCount}/{maxRetries})
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247, 250, 252, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: moderateScale(10),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
  },
  fallbackContainer: {
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: moderateScale(8),
  },
  fallbackContent: {
    alignItems: 'center',
    padding: scale(16),
  },
  fallbackText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  errorText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
    marginTop: verticalScale(8),
  },
  retryButtonText: {
    fontSize: moderateScale(12),
    color: Colors.white,
    marginLeft: scale(4),
    fontWeight: '500',
  },
});

export default RobustImage;