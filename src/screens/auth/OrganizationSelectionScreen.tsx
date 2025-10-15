import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import OrganizationSelector from '../../components/ui/OrganizationSelector';
import { UserMembership } from '../../types/database';

interface OrganizationSelectionScreenProps {
  navigation: any;
}

const OrganizationSelectionScreen: React.FC<OrganizationSelectionScreenProps> = ({ navigation }) => {
  const { userMemberships } = useAuth();
  const { switchOrganization, isLoading, error } = useOrganization();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleOrganizationSelect = async (orgId: string) => {
    try {
      setIsSelecting(true);
      
      console.log(`🔄 User selected organization: ${orgId}`);
      
      // Switch to the selected organization
      await switchOrganization(orgId);
      
      console.log('✅ Organization selection completed');
      
      // Navigation will be handled automatically by RootNavigator
      // based on the updated organization context
      
    } catch (error) {
      console.error('❌ Error selecting organization:', error);
      Alert.alert(
        'Selection Error',
        'Failed to select organization. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSelecting(false);
    }
  };

  // Show loading state
  if (isLoading || isSelecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5CE6" />
        <Text style={styles.loadingText}>
          {isSelecting ? 'Setting up your organization...' : 'Loading organizations...'}
        </Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Organizations</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  // Show empty state if no memberships
  if (!userMemberships || userMemberships.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Organizations Found</Text>
        <Text style={styles.emptyMessage}>
          You don't appear to be a member of any organizations. Please contact your administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OrganizationSelector
        memberships={userMemberships}
        onSelect={handleOrganizationSelect}
        title="Welcome Back!"
        subtitle="You're a member of multiple organizations. Which one would you like to access?"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OrganizationSelectionScreen;