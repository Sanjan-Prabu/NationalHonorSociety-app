import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';

interface ForceLoadImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

/**
 * Force Load Image - tries multiple techniques to load images
 */
const ForceLoadImage: React.FC<ForceLoadImageProps> = ({
  source,
  style,
  resizeMode = 'cover'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUri, setCurrentUri] = useState('');

  useEffect(() => {
    // Only add cache busting on retry, not on initial load
    let uri = source.uri;
    if (retryCount > 0) {
      const separator = uri.includes('?') ? '&' : '?';
      uri = `${uri}${separator}retry=${retryCount}`;
    }
    setCurrentUri(uri);
    setLoading(true);
    setError(false);
    
    console.log(`[ForceLoadImage] Loading (attempt ${retryCount + 1}): ${uri}`);
  }, [source.uri, retryCount]);

  const handleLoadStart = () => {
    console.log(`[ForceLoadImage] Load started: ${currentUri}`);
    setLoading(true);
    setError(false);
  };

  const handleLoad = () => {
    console.log(`[ForceLoadImage] Load success: ${currentUri}`);
    setLoading(false);
    setError(false);
  };

  const handleError = (errorEvent: any) => {
    console.error(`[ForceLoadImage] ❌ Load error (attempt ${retryCount + 1}/3):`, currentUri);
    console.error('[ForceLoadImage] Error details:', JSON.stringify(errorEvent?.nativeEvent || errorEvent, null, 2));
    setLoading(false);
    setError(true);
    
    // Auto-retry up to 3 times
    if (retryCount < 3) {
      setTimeout(() => {
        console.log(`[ForceLoadImage] 🔄 Auto-retry ${retryCount + 2}/3`);
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
    } else {
      console.error(`[ForceLoadImage] ❌ FAILED after 3 attempts: ${currentUri}`);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: currentUri }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {error && retryCount >= 3 && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load</Text>
          <Text style={styles.errorSubtext}>Tried {retryCount + 1} times</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  loadingText: {
    marginTop: 5,
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
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default ForceLoadImage;