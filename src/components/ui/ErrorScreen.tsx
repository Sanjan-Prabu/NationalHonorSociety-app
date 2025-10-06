import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  errorType?: 'network' | 'auth' | 'general';
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title,
  message,
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = false,
  errorType = 'general',
}) => {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return '📡';
      case 'auth':
        return '🔐';
      default:
        return '⚠️';
    }
  };

  const getDefaultTitle = () => {
    switch (errorType) {
      case 'network':
        return 'Connection Error';
      case 'auth':
        return 'Authentication Error';
      default:
        return 'Something Went Wrong';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>{getErrorIcon()}</Text>
          <Text style={styles.errorTitle}>{title || getDefaultTitle()}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {showRetry && onRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            
            {showGoBack && onGoBack && (
              <TouchableOpacity style={styles.goBackButton} onPress={onGoBack}>
                <Text style={styles.goBackButtonText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {errorType === 'network' && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
              <Text style={styles.tipText}>• Check your internet connection</Text>
              <Text style={styles.tipText}>• Try switching between WiFi and mobile data</Text>
              <Text style={styles.tipText}>• Make sure you're not in airplane mode</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  goBackButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  goBackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default ErrorScreen;