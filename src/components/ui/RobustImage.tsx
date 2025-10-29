import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  solidBlue: '#2B5CE6',
  textMedium: '#4A5568',
  textLight: '#718096',
  dividerColor: '#D1D5DB',
  white: '#FFFFFF',
};

interface RobustImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fallbackText?: string;
  fallbackIcon?: string;
  onPress?: () => void;
  maxRetries?: number;
}

const RobustImage: React.FC<RobustImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  fallbackText = 'Image',
  fallbackIcon = 'image',
  onPress,
  maxRetries = 3,
}) => {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Reset states when source changes
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
  }, [source.uri]);

  const handleImageLoad = () => {
    setImageError(false);
    setRetryCount(0);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    if (retryCount < maxRetries) {
      // Auto-retry with exponential backoff
      const delay = Math.min(Math.pow(2, retryCount) * 1000, 5000); // Max 5 seconds
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
      }, delay);
    } else {
      setImageError(true);
    }
  };

  const handleRetry = () => {
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
  };

  const containerStyle = [styles.container, style];

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      {/* Main Image */}
      <Image
        source={source}
        style={styles.image}
        resizeMode={resizeMode}
        onLoad={handleImageLoad}
        onError={handleImageError}
        // Force reload on retry by changing key
        key={`${source.uri}-${retryCount}`}
      />
      
      {/* Loading State */}
      {isLoading && retryCount > 0 && !imageError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={Colors.solidBlue} />
          <Text style={styles.loadingText}>
            Retrying... ({retryCount}/{maxRetries})
          </Text>
        </View>
      )}
      
      {/* Error Fallback */}
      {imageError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContent}>
            <Icon name={fallbackIcon} size={moderateScale(32)} color={Colors.textMedium} />
            <Text style={styles.errorText}>{fallbackText}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Icon name="refresh" size={moderateScale(16)} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Zoom Indicator for Pressable Images */}
      {onPress && !imageError && !isLoading && (
        <View style={styles.zoomIndicator}>
          <Icon name="zoom-in" size={moderateScale(20)} color="rgba(255, 255, 255, 0.8)" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7FAFC',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: moderateScale(10),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginTop: verticalScale(8),
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(12),
    padding: scale(6),
  },
  zoomIndicator: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: moderateScale(12),
    padding: scale(4),
  },
});

export default RobustImage;