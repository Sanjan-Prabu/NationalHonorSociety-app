/**
 * NotificationBadge - Badge component for displaying notification counts
 * Shows notification counts on tab icons and other UI elements
 * Requirements: 7.5, 8.5, 10.3
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// =============================================================================
// NOTIFICATION BADGE INTERFACES
// =============================================================================

export interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  showZero?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  offset?: { x: number; y: number };
}

// =============================================================================
// NOTIFICATION BADGE COMPONENT
// =============================================================================

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  color = '#FF3B30',
  textColor = '#FFFFFF',
  showZero = false,
  style,
  textStyle,
  position = 'top-right',
  offset = { x: 0, y: 0 }
}) => {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Get size-based styles
  const sizeStyles = getSizeStyles(size);
  
  // Get position-based styles
  const positionStyles = getPositionStyles(position, offset);

  return (
    <View
      style={[
        styles.badge,
        sizeStyles.container,
        positionStyles,
        { backgroundColor: color },
        style
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          { color: textColor },
          textStyle
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
};

// =============================================================================
// TAB BADGE WRAPPER COMPONENT
// =============================================================================

export interface TabBadgeProps {
  children: React.ReactNode;
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  showZero?: boolean;
  badgeStyle?: ViewStyle;
  badgeTextStyle?: TextStyle;
}

/**
 * Wrapper component for adding badges to tab icons
 * Requirements: 7.5, 8.5
 */
export const TabBadge: React.FC<TabBadgeProps> = ({
  children,
  count,
  maxCount = 99,
  size = 'small',
  color = '#FF3B30',
  textColor = '#FFFFFF',
  showZero = false,
  badgeStyle,
  badgeTextStyle
}) => {
  return (
    <View style={styles.tabContainer}>
      {children}
      {(count > 0 || showZero) && (
        <NotificationBadge
          count={count}
          maxCount={maxCount}
          size={size}
          color={color}
          textColor={textColor}
          showZero={showZero}
          position="top-right"
          offset={{ x: -4, y: 4 }}
          style={badgeStyle}
          textStyle={badgeTextStyle}
        />
      )}
    </View>
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets size-based styles for the badge
 */
function getSizeStyles(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        container: {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          paddingHorizontal: 4,
        },
        text: {
          fontSize: 10,
          fontWeight: '600' as const,
          lineHeight: 12,
        }
      };
    case 'medium':
      return {
        container: {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          paddingHorizontal: 6,
        },
        text: {
          fontSize: 12,
          fontWeight: '600' as const,
          lineHeight: 14,
        }
      };
    case 'large':
      return {
        container: {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 8,
        },
        text: {
          fontSize: 14,
          fontWeight: '600' as const,
          lineHeight: 16,
        }
      };
    default:
      return getSizeStyles('medium');
  }
}

/**
 * Gets position-based styles for the badge
 */
function getPositionStyles(
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center',
  offset: { x: number; y: number }
): ViewStyle {
  const baseStyle: ViewStyle = {
    position: 'absolute',
    zIndex: 10,
  };

  switch (position) {
    case 'top-right':
      return {
        ...baseStyle,
        top: offset.y,
        right: offset.x,
      };
    case 'top-left':
      return {
        ...baseStyle,
        top: offset.y,
        left: offset.x,
      };
    case 'bottom-right':
      return {
        ...baseStyle,
        bottom: offset.y,
        right: offset.x,
      };
    case 'bottom-left':
      return {
        ...baseStyle,
        bottom: offset.y,
        left: offset.x,
      };
    case 'center':
      return {
        ...baseStyle,
        top: '50%',
        left: '50%',
        transform: [
          { translateX: -12 + offset.x },
          { translateY: -12 + offset.y }
        ],
      };
    default:
      return getPositionStyles('top-right', offset);
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabContainer: {
    position: 'relative',
  },
});

export default NotificationBadge;