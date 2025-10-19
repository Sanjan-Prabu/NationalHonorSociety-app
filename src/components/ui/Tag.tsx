// components/Tag.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  lightBlue: '#EBF8FF',
  lightGreen: '#EBF8F2',
  lightYellow: '#FEF5E7',
  lightPurple: '#F3E8FF',
  lightOrange: '#FEF5E7',
  lightTeal: '#E6FFFA',
  solidBlue: '#2B5CE6',
  green: '#48BB78',
  yellow: '#ECC94B',
  purple: '#9F7AEA',
  orange: '#e8b569ff',
  teal: '#38B2AC',
  white: '#FFFFFF',
  inactiveBackground: '#F7FAFC',
  inactiveText: '#718096',
};

interface TagProps {
  text: string;
  variant?: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' | 'inactive';
  style?: any;
  active?: boolean;
}

const Tag: React.FC<TagProps> = ({ text, variant = 'inactive', style, active = false }) => {
  const getVariantStyles = () => {
    if (!active || variant === 'inactive') {
      return {
        backgroundColor: Colors.inactiveBackground,
        textColor: Colors.inactiveText,
      };
    }
    switch (variant) {
      case 'green':
        return {
          backgroundColor: Colors.lightGreen,
          textColor: Colors.green,
        };
      case 'yellow':
        return {
          backgroundColor: Colors.lightYellow,
          textColor: Colors.yellow,
        };
      case 'purple':
        return {
          backgroundColor: Colors.lightPurple,
          textColor: Colors.purple,
        };
      case 'orange':
        return {
          backgroundColor: Colors.lightOrange,
          textColor: Colors.orange,
        };
      case 'teal':
        return {
          backgroundColor: Colors.lightTeal,
          textColor: Colors.teal,
        };
      case 'blue':
      default:
        return {
          backgroundColor: Colors.lightBlue,
          textColor: Colors.solidBlue,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: variantStyles.backgroundColor }, style]}>
      <Text style={[styles.text, { color: variantStyles.textColor }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
});

export default Tag;