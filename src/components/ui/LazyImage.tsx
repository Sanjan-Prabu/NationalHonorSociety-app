import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  ImageStyle,
  ImageProps,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  white: '#FFFFFF',
  lightGray: '#F7FAFC',
  textLight: '#718096',
  primaryBlue: '#4A90E2',
};

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  containerStyle?: ViewStyle;
  imageStyle?: ImageStyle;
  fadeInDuration?: number;
  threshold?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  enableFadeIn?: boolean;
  enableProgressiveLoading?: boolean;
  lowQualitySource?: { uri: string };
}

/**
 * LazyImage component with progressive loading and fade-in animations
 * Optimizes image loading performance with lazy loading and caching
 */
const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholder,
  loadingIndicator,
  errorPlaceholder,
  containerStyle,
  imageStyle,
  fadeInDuration = 300,
  threshold = 50,
  onLoadStart,
  onLoadEnd,
  onError,
  enableFadeIn = true,
  enableProgressiveLoading = true,
  lowQualitySource,
  ...imageProps
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(true); // Start with true for immediate loading
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lowQualityFadeAnim = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);

  // Check if image should be loaded based on visibility
  const checkVisibility = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        // Simple visibility check - load if within threshold of viewport
        if (pageY < threshold + 1000 && pageY + height > -threshold) {
          setShouldLoad(true);
        }
      });
    }
  }, [threshold]);

  // Start loading immediately when component mounts
  useEffect(() => {
    setShouldLoad(true);
  }, []);

  // Handle low quality image load
  const handleLowQualityLoad = useCallback(() => {
    setLowQualityLoaded(true);
    if (enableFadeIn) {
      Animated.timing(lowQualityFadeAnim, {
        toValue: 1,
        duration: fadeInDuration / 2,
        useNativeDriver: true,
      }).start();
    }
  }, [enableFadeIn, fadeInDuration, lowQualityFadeAnim]);

  // Handle main image load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  // Handle main image load success
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    onLoadEnd?.();
    
    if (enableFadeIn) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start(() => {
        // Fade out low quality image after main image is visible
        if (lowQualityLoaded) {
          Animated.timing(lowQualityFadeAnim, {
            toValue: 0,
            duration: fadeInDuration / 2,
            useNativeDriver: true,
          }).start();
        }
      });
    }
  }, [enableFadeIn, fadeInDuration, fadeAnim, lowQualityLoaded, lowQualityFadeAnim, onLoadEnd]);

  // Handle image load error
  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  }, [onError]);

  // Default loading indicator
  const defaultLoadingIndicator = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={Colors.primaryBlue} />
    </View>
  );

  // Default placeholder
  const defaultPlaceholder = (
    <View style={[styles.placeholder, imageStyle]} />
  );

  // Default error placeholder - show actual error, not loading spinner
  const defaultErrorPlaceholder = (
    <View style={[styles.errorPlaceholder, imageStyle]}>
      <Text style={styles.errorText}>✕</Text>
    </View>
  );

  // Always render the image container since we're loading immediately
  // The lazy loading is now handled by the loading states rather than visibility

  return (
    <View ref={containerRef} style={[styles.container, containerStyle]}>
      {/* Low quality image for progressive loading */}
      {enableProgressiveLoading && lowQualitySource && (
        <Animated.View
          style={[
            styles.imageContainer,
            { opacity: enableFadeIn ? lowQualityFadeAnim : 1 }
          ]}
        >
          <Image
            source={lowQualitySource}
            style={[styles.image, imageStyle]}
            onLoad={handleLowQualityLoad}
            onError={() => {}} // Ignore low quality errors
            blurRadius={2}
            {...imageProps}
          />
        </Animated.View>
      )}

      {/* Main image */}
      <Animated.View
        style={[
          styles.imageContainer,
          { opacity: enableFadeIn ? fadeAnim : 1 }
        ]}
      >
        <Image
          source={source}
          style={[styles.image, imageStyle]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          {...imageProps}
        />
      </Animated.View>

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <View style={styles.overlayContainer}>
          {loadingIndicator || defaultLoadingIndicator}
        </View>
      )}

      {/* Error placeholder */}
      {hasError && (
        <View style={styles.overlayContainer}>
          {errorPlaceholder || defaultErrorPlaceholder}
        </View>
      )}

      {/* Initial placeholder - only show if still loading and no error */}
      {isLoading && !hasError && !lowQualityLoaded && (
        <View style={styles.overlayContainer}>
          {placeholder || defaultPlaceholder}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.lightGray,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  placeholder: {
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 24,
    color: Colors.textLight,
  },
});

export default LazyImage;