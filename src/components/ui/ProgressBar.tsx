import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  solidBlue: '#2B5CE6',
  lightBlue: '#EBF8FF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  successGreen: '#38A169',
};

interface ProgressBarProps {
  currentHours: number;
  totalHours: number;
  containerStyle?: any;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentHours, 
  totalHours, 
  containerStyle 
}) => {
  const progress = Math.min(currentHours / totalHours, 1);
  const percentage = Math.round(progress * 100);
  const isComplete = currentHours >= totalHours;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Progress Info */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {currentHours} of {totalHours} hours completed
        </Text>
        <Text style={[styles.percentageText, isComplete && styles.completeText]}>
          {percentage}%
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${percentage}%` },
              isComplete && styles.progressBarComplete
            ]} 
          />
        </View>
      </View>

      {/* Status Text */}
      <Text style={[styles.statusText, isComplete && styles.completeStatusText]}>
        {isComplete 
          ? '🎉 Congratulations! You\'ve completed your volunteer hours!' 
          : `${totalHours - currentHours} hours remaining`
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(4), // Add horizontal padding for better spacing
  },
  progressText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1, // Allow text to take available space
    marginRight: scale(12), // Add margin to separate from percentage
  },
  percentageText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    minWidth: scale(50), // Ensure consistent width for percentage
    textAlign: 'right', // Right-align the percentage
  },
  completeText: {
    color: Colors.successGreen,
  },
  progressBarContainer: {
    marginBottom: verticalScale(8),
  },
  progressBarBackground: {
    height: verticalScale(8),
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(4),
    minWidth: scale(4), // Minimum width for visibility
  },
  progressBarComplete: {
    backgroundColor: Colors.successGreen,
  },
  statusText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
  },
  completeStatusText: {
    color: Colors.successGreen,
    fontWeight: '500',
  },
});

export default ProgressBar;