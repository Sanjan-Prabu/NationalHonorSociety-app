import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { moderateScale, verticalScale } from 'react-native-size-matters';

const Colors = {
  solidBlue: '#2B5CE6',
  textMedium: '#4A5568',
  white: '#FFFFFF',
};

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'large' 
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.solidBlue} />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  message: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
  },
});

export default LoadingSpinner;