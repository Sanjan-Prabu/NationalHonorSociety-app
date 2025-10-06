import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { moderateScale, verticalScale, scale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  errorRed: '#E53E3E',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  white: '#FFFFFF',
  solidBlue: '#2B5CE6',
  lightGray: '#F7FAFC',
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RoleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Role Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={moderateScale(48)} color={Colors.errorRed} />
            
            <Text style={styles.errorTitle}>Access Control Error</Text>
            
            <Text style={styles.errorMessage}>
              There was an issue verifying your access permissions. This might be due to a network issue or a temporary problem.
            </Text>
            
            {this.state.error && __DEV__ && (
              <Text style={styles.errorDetails}>
                {this.state.error.message}
              </Text>
            )}
            
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Icon name="refresh" size={moderateScale(20)} color={Colors.white} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              If this problem persists, please contact your administrator or try logging out and back in.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: scale(20),
  },
  errorCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: scale(24),
    alignItems: 'center',
    maxWidth: scale(320),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  errorTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: verticalScale(16),
  },
  errorDetails: {
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#FFF5F5',
    padding: scale(8),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: Colors.solidBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(16),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  helpText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(16),
  },
});