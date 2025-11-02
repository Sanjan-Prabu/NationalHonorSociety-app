import React, { useState, useMemo, useCallback } from 'react';
import { 
  Image, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { fixImageUrl } from '../../utils/imageUrlFixer';

interface UniversalImageViewerProps {
  imageUrl?: string;
  fallbackUrls?: string[];
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  showRetryButton?: boolean;
  placeholder?: React.ReactNode;
  testID?: string;
}

/**
 * Universal Image Viewer that handles all URL formats and provides bulletproof loading
 * - Automatically tries multiple URL variants
 * - Handles network errors with retry logic
 * - Shows loading states and error recovery options
 * - Works with both old and new R2 URL formats
 */
const UniversalImageViewer: React.FC<UniversalImageViewerProps> = ({
  imageUrl,
  fallbackUrls = [],
  style,
  resizeMode = 'cover',
  onPress,
  showRetryButton = true,
  placeholder,
  testID
}) => {
  const [urlIndex, setUrlIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Generate all possible URL variants
  const urlVariants = useMemo(() => {
    if (!imageUrl) return [];
    
    const variants = [imageUrl];
    
    // Add reverse-fixed URL variant (convert direct R2 back to custom domain)
    if (imageUrl.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
      const customDomainUrl = imageUrl.replace(
        'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/',
        'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/'
      );
      variants.push(customDomainUrl);
    }
    
    // Add fixed URL variant if needed (old to new)
    if (imageUrl.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
      const fixedUrl = fixImageUrl(imageUrl);
      if (fixedUrl !== imageUrl) {
        variants.push(fixedUrl);
      }
    }
    
    // Add any additional fallback URLs
    variants.push(...fallbackUrls);
    
    // Remove duplicates and empty values
    return [...new Set(variants.filter(Boolean))];
  }, [imageUrl, fallbackUrls]);

  const currentUrl = urlVariants[urlIndex];

  const handleImageLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setLoading(false);
    
    // Try next URL variant automatically
    const nextIndex = urlIndex + 1;
    if (nextIndex < urlVariants.length) {
      console.log(`[UniversalImageViewer] Trying next URL variant (${nextIndex + 1}/${urlVariants.length})`);
      setUrlIndex(nextIndex);
      setLoading(true);
      setError(false);
    } else {
      console.error(`[UniversalImageViewer] All URL variants failed for:`, imageUrl);
      setError(true);
    }
  }, [urlIndex, urlVariants.length, imageUrl]);

  const handleRetry = useCallback(() => {
    console.log(`[UniversalImageViewer] Manual retry attempt ${retryCount + 1}`);
    setRetryCount(prev => prev + 1);
    setUrlIndex(0); // Start from first URL again
    setLoading(true);
    setError(false);
  }, [retryCount]);

  // Show placeholder if no URL provided
  if (!imageUrl || urlVariants.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {placeholder || (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>
    );
  }

  const imageContent = (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load image</Text>
          {showRetryButton && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              testID={`${testID}-retry`}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {currentUrl && (
        <Image
          source={{ uri: currentUrl }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
          testID={testID}
        />
      )}
    </View>
  );

  if (onPress) {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    zIndex: 1,
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
});

export default UniversalImageViewer;