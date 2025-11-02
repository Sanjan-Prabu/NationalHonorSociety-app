/**
 * NotificationHighlight - Visual feedback component for notification navigation
 * Provides highlighting and visual feedback when navigating from notifications
 * Requirements: 7.5, 10.3, 10.4, 10.5
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

// =============================================================================
// NOTIFICATION HIGHLIGHT INTERFACES
// =============================================================================

export interface NotificationHighlightProps {
  children: React.ReactNode;
  isHighlighted?: boolean;
  highlightColor?: string;
  animationType?: 'pulse' | 'glow' | 'bounce' | 'fade';
  duration?: number;
  autoHide?: boolean;
  autoHideDuration?: number;
  onHighlightComplete?: () => void;
  style?: ViewStyle;
}

// =============================================================================
// NOTIFICATION HIGHLIGHT COMPONENT
// =============================================================================

export const NotificationHighlight: React.FC<NotificationHighlightProps> = ({
  children,
  isHighlighted = false,
  highlightColor = '#007AFF',
  animationType = 'pulse',
  duration = 1000,
  autoHide = true,
  autoHideDuration = 3000,
  onHighlightComplete,
  style
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [showHighlight, setShowHighlight] = useState(isHighlighted);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start highlight animation when isHighlighted changes to true
  useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true);
      startHighlightAnimation();
      
      // Auto-hide after specified duration
      if (autoHide) {
        timeoutRef.current = setTimeout(() => {
          setShowHighlight(false);
          onHighlightComplete?.();
        }, autoHideDuration);
      }
    } else {
      setShowHighlight(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isHighlighted, autoHide, autoHideDuration]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Starts the highlight animation based on animation type
   */
  const startHighlightAnimation = () => {
    animatedValue.setValue(0);

    switch (animationType) {
      case 'pulse':
        startPulseAnimation();
        break;
      case 'glow':
        startGlowAnimation();
        break;
      case 'bounce':
        startBounceAnimation();
        break;
      case 'fade':
        startFadeAnimation();
        break;
      default:
        startPulseAnimation();
    }
  };

  /**
   * Pulse animation - scales and fades the highlight
   */
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
      { iterations: autoHide ? 3 : -1 }
    ).start();
  };

  /**
   * Glow animation - creates a glowing border effect
   */
  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
      { iterations: autoHide ? 2 : -1 }
    ).start();
  };

  /**
   * Bounce animation - bounces the scale
   */
  const startBounceAnimation = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 0.8,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Fade animation - simple fade in and out
   */
  const startFadeAnimation = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 3,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 3,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: duration / 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Gets animated styles based on animation type
   */
  const getAnimatedStyles = (): ViewStyle => {
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    });

    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.05],
    });

    switch (animationType) {
      case 'pulse':
        return {
          opacity,
          transform: [{ scale }],
        };
      case 'glow':
        return {
          opacity,
          shadowOpacity: animatedValue,
        };
      case 'bounce':
        return {
          opacity,
          transform: [{ scale }],
        };
      case 'fade':
        return {
          opacity,
        };
      default:
        return {
          opacity,
        };
    }
  };

  if (!showHighlight) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Highlight overlay */}
      <Animated.View
        style={[
          styles.highlight,
          {
            backgroundColor: highlightColor,
            borderColor: highlightColor,
          },
          getAnimatedStyles(),
        ]}
      />
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

// =============================================================================
// NOTIFICATION HIGHLIGHT WRAPPER HOOK
// =============================================================================

export interface UseNotificationHighlightOptions {
  highlightId?: string;
  fromNotification?: boolean;
  highlightColor?: string;
  animationType?: 'pulse' | 'glow' | 'bounce' | 'fade';
  duration?: number;
}

/**
 * Hook for managing notification highlight state
 * Requirements: 10.3, 10.4, 10.5
 */
export function useNotificationHighlight(
  itemId: string,
  options: UseNotificationHighlightOptions = {}
) {
  const {
    highlightId,
    fromNotification = false,
    highlightColor = '#007AFF',
    animationType = 'pulse',
    duration = 1000
  } = options;

  const [isHighlighted, setIsHighlighted] = useState(false);

  // Check if this item should be highlighted
  useEffect(() => {
    if (fromNotification && highlightId === itemId) {
      setIsHighlighted(true);
    }
  }, [fromNotification, highlightId, itemId]);

  const clearHighlight = () => {
    setIsHighlighted(false);
  };

  return {
    isHighlighted,
    clearHighlight,
    highlightProps: {
      isHighlighted,
      highlightColor,
      animationType,
      duration,
      onHighlightComplete: clearHighlight
    }
  };
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
  },
});

export default NotificationHighlight;