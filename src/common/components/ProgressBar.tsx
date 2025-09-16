import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  progressBackground: '#E2E8F0',
  white: '#FFFFFF',
};

interface ProgressBarProps {
  currentHours?: number; // default 0
  totalHours?: number; // default 10
  showLabel?: boolean; // default true
  height?: number; // default 8
  backgroundColor?: string; // default Colors.progressBackground
  progressColor?: string; // default Colors.solidBlue
  textColor?: string; // default Colors.textDark
  labelStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentHours = 0,
  totalHours = 10,
  showLabel = true,
  height = 8,
  backgroundColor = Colors.progressBackground,
  progressColor = Colors.solidBlue,
  textColor = Colors.textDark,
  labelStyle = {},
  containerStyle = {},
}) => {
  // Calculate percentage (0-100)
  const percentage = Math.min((currentHours / totalHours) * 100, 100);

  // Format hours display
  const formatHours = (hours: number) => {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.labelText, { color: textColor }, labelStyle]}>Volunteer Hours</Text>
          <Text style={[styles.hoursText, { color: textColor }, labelStyle]}>
            {formatHours(currentHours)}/{totalHours} hours
          </Text>
        </View>
      )}

      <View
        style={[styles.progressBarContainer, { height: verticalScale(height), backgroundColor }]}
      >
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
              height: verticalScale(height),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: verticalScale(16),
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  labelText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  hoursText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  progressBarContainer: {
    borderRadius: moderateScale(4),
    overflow: 'hidden',
  },
  progressBar: {
    borderRadius: moderateScale(4),
  },
});

export default ProgressBar;
