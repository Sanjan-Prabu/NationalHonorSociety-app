import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  successGreen: '#38A169',
  errorRed: '#E53E3E',
  lightGray: '#F7FAFC',
  progressBackground: '#E2E8F0',
};

interface UploadProgressIndicatorProps {
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  showPercentage?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

/**
 * Enhanced upload progress indicator with smooth animations and status feedback
 * Provides visual feedback for image upload operations
 */
const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  progress,
  status,
  message,
  showPercentage = true,
  showIcon = true,
  animated = true,
  size = 'medium',
  style,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Animate progress changes
  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, progressAnim]);

  // Animate status changes
  useEffect(() => {
    if (status === 'success') {
      // Success pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (status === 'error') {
      // Error shake animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status, scaleAnim]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { height: verticalScale(32) },
          progressBar: { height: verticalScale(4) },
          text: { fontSize: moderateScale(12) },
          icon: moderateScale(16),
        };
      case 'large':
        return {
          container: { height: verticalScale(56) },
          progressBar: { height: verticalScale(8) },
          text: { fontSize: moderateScale(16) },
          icon: moderateScale(24),
        };
      default: // medium
        return {
          container: { height: verticalScale(44) },
          progressBar: { height: verticalScale(6) },
          text: { fontSize: moderateScale(14) },
          icon: moderateScale(20),
        };
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return Colors.successGreen;
      case 'error':
        return Colors.errorRed;
      case 'uploading':
      case 'processing':
        return Colors.primaryBlue;
      default:
        return Colors.textLight;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'uploading':
        return 'cloud-upload';
      case 'processing':
        return 'hourglass-empty';
      default:
        return 'cloud-upload';
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return 'Uploading image...';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  const sizeStyles = getSizeStyles();
  const statusColor = getStatusColor();
  const isActive = status === 'uploading' || status === 'processing';

  if (status === 'idle') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        sizeStyles.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, sizeStyles.progressBar]}>
        <Animated.View
          style={[
            styles.progressBar,
            sizeStyles.progressBar,
            {
              backgroundColor: statusColor,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>

      {/* Status Content */}
      <View style={styles.statusContainer}>
        {/* Icon and Activity Indicator */}
        <View style={styles.iconContainer}>
          {isActive ? (
            <ActivityIndicator size="small" color={statusColor} />
          ) : showIcon ? (
            <Icon
              name={getStatusIcon()}
              size={sizeStyles.icon}
              color={statusColor}
            />
          ) : null}
        </View>

        {/* Status Text */}
        <Text
          style={[
            styles.statusText,
            sizeStyles.text,
            { color: statusColor },
          ]}
          numberOfLines={1}
        >
          {getStatusMessage()}
        </Text>

        {/* Percentage */}
        {showPercentage && (status === 'uploading' || status === 'processing') && (
          <Text
            style={[
              styles.percentageText,
              sizeStyles.text,
              { color: statusColor },
            ]}
          >
            {Math.round(progress)}%
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginVertical: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 2,
  },
  progressBarContainer: {
    backgroundColor: Colors.progressBackground,
    borderRadius: moderateScale(3),
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  progressBar: {
    borderRadius: moderateScale(3),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: scale(8),
    minWidth: scale(24),
    alignItems: 'center',
  },
  statusText: {
    flex: 1,
    fontWeight: '500',
  },
  percentageText: {
    fontWeight: '600',
    marginLeft: scale(8),
  },
});

export default UploadProgressIndicator;