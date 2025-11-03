import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import LazyImage from './LazyImage';
import { fixImageUrl } from '../../utils/imageUrlFixer';

interface RobustR2ImageProps {
  imageUrl?: string;
  style?: any;
  imageStyle?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  testID?: string;
}

/**
 * Robust R2 Image component that handles URL format issues and provides retry logic
 * Specifically designed for R2 image loading with automatic fallback
 */
const RobustR2Image: React.FC<RobustR2ImageProps> = ({
  imageUrl,
  style,
  imageStyle,
  resizeMode = 'cover',
  onPress,
  testID
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate URL variants for fallback
  const getUrlVariants = useCallback((url: string): string[] => {
    const variants = [];
    
    // Add the fixed URL first
    const fixedUrl = fixImageUrl(url);
    variants.push(fixedUrl);
    
    // Add original URL if different
    if (url !== fixedUrl) {
      variants.push(url);
    }
    
    // Add reverse conversion (direct R2 to custom domain)
    if (url.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
      const customDomainUrl = url.replace(
        'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/',
        'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/'
      );
      variants.push(customDomainUrl);
    }
    
    // Add forward conversion (custom domain to direct R2)
    if (url.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
      const directUrl = url.replace(
        'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/',
        'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/'
      );
      variants.push(directUrl);
    }
    
    // Remove duplicates
    return [...new Set(variants)];
  }, []);

  // Initialize URL when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      const variants = getUrlVariants(imageUrl);
      setCurrentUrl(variants[0]);
      setRetryCount(0);
      setHasError(false);
      setIsLoading(true);
    } else {
      setCurrentUrl(null);
      setHasError(false);
      setIsLoading(false);
    }
  }, [imageUrl, getUrlVariants]);

  // Handle image load success
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, [currentUrl]);

  // Handle image load error with automatic retry
  const handleError = useCallback((error: any) => {
    if (!imageUrl) return;
    
    const variants = getUrlVariants(imageUrl);
    const nextIndex = retryCount + 1;
    
    if (nextIndex < variants.length) {
      // Try next URL variant
      const nextUrl = variants[nextIndex];
      setCurrentUrl(nextUrl);
      setRetryCount(nextIndex);
      setIsLoading(true);
    } else {
      // All variants failed
      setIsLoading(false);
      setHasError(true);
    }
  }, [imageUrl, retryCount, getUrlVariants]);

  // Manual retry function
  const handleManualRetry = useCallback(() => {
    if (!imageUrl) return;
    
    const variants = getUrlVariants(imageUrl);
    setCurrentUrl(variants[0]);
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
  }, [imageUrl, getUrlVariants]);

  // Show placeholder if no URL
  if (!imageUrl || !currentUrl) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      </View>
    );
  }

  const imageContent = (
    <View style={[styles.container, style]}>
      <LazyImage
        source={{ uri: currentUrl }}
        imageStyle={[styles.image, imageStyle]}
        resizeMode={resizeMode}
        onLoadStart={() => {
          setIsLoading(true);
        }}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        enableFadeIn={true}
        fadeInDuration={300}
        testID={testID}
      />
      
      {/* Error overlay with retry button */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load image</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleManualRetry}
            testID={`${testID}-retry`}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (onPress && !hasError) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {imageContent}
      </TouchableOpacity>
    );
  }

  return imageContent;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    zIndex: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default RobustR2Image;