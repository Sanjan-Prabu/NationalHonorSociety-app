import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { fixImageUrl } from '../../utils/imageUrlFixer';

interface SimpleR2ImageProps {
  imageUrl?: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  testID?: string;
}

/**
 * Simple R2 Image component with basic error handling and retry
 * Uses standard React Native Image with cache busting
 */
const SimpleR2Image: React.FC<SimpleR2ImageProps> = ({
  imageUrl,
  style,
  resizeMode = 'cover',
  onPress,
  testID
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Initialize URL
  useEffect(() => {
    if (imageUrl) {
      const fixedUrl = fixImageUrl(imageUrl);
      // Add cache busting parameter
      const urlWithCacheBust = `${fixedUrl}?t=${Date.now()}`;
      setCurrentUrl(urlWithCacheBust);
      setLoading(true);
      setError(false);
      console.log('[SimpleR2Image] Loading image:', urlWithCacheBust);
    }
  }, [imageUrl, retryCount]);

  const handleLoadStart = useCallback(() => {
    console.log('[SimpleR2Image] Load started for:', currentUrl);
    setLoading(true);
    setError(false);
  }, [currentUrl]);

  const handleLoadEnd = useCallback(() => {
    console.log('[SimpleR2Image] Load completed for:', currentUrl);
    setLoading(false);
    setError(false);
  }, [currentUrl]);

  const handleError = useCallback((errorEvent: any) => {
    console.error('[SimpleR2Image] Load error for:', currentUrl, errorEvent.nativeEvent);
    setLoading(false);
    setError(true);
  }, [currentUrl]);

  const handleRetry = useCallback(() => {
    console.log('[SimpleR2Image] Manual retry initiated');
    setRetryCount(prev => prev + 1);
  }, []);

  if (!imageUrl) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      </View>
    );
  }

  const imageContent = (
    <View style={[styles.container, style]}>
      {currentUrl && (
        <Image
          source={{ uri: currentUrl }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          testID={testID}
        />
      )}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load image</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
            testID={`${testID}-retry`}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (onPress && !error) {
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
  placeholder: {
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
  loadingOverlay: {
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
  errorOverlay: {
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
});

export default SimpleR2Image;