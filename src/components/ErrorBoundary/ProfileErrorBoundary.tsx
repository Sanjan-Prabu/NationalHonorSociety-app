import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

const Colors = {
  errorRed: '#E53E3E',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  white: '#FFFFFF',
  border: '#E2E8F0',
  background: '#F7FAFC',
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ProfileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ProfileErrorBoundary caught an error:', error, errorInfo);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons 
            name="error-outline" 
            size={moderateScale(48)} 
            color={Colors.errorRed} 
          />
          <Text style={styles.errorTitle}>Profile Error</Text>
          <Text style={styles.errorMessage}>
            Something went wrong with the profile component.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={this.handleRetry}
            accessibilityLabel="Retry loading profile"
            accessibilityRole="button"
          >
            <MaterialIcons 
              name="refresh" 
              size={moderateScale(20)} 
              color={Colors.white} 
            />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
    backgroundColor: Colors.background,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: verticalScale(200),
  },
  errorTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorRed,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(6),
    gap: scale(8),
  },
  retryText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
});

export default ProfileErrorBoundary;