import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Test component to validate organization context functionality
 * This component displays current organization state and provides testing controls
 */
const OrganizationContextTest: React.FC = () => {
  const {
    activeOrganization,
    activeMembership,
    userMemberships,
    hasMultipleMemberships,
    isLoading,
    error,
    switchOrganization,
    isOfficer,
    isMember,
    canSwitchOrganizations,
    getOrganizationRole,
  } = useOrganization();

  const { profile, userMemberships: authMemberships } = useAuth();

  const handleTestSwitch = async () => {
    if (userMemberships.length > 1) {
      const otherOrg = userMemberships.find(m => m.org_id !== activeMembership?.org_id);
      if (otherOrg) {
        console.log('🧪 Testing organization switch to:', otherOrg.org_name);
        await switchOrganization(otherOrg.org_id);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Organization Context Test</Text>
      
      {/* Current State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current State</Text>
        <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
        <Text>Error: {error || 'None'}</Text>
        <Text>Active Org: {activeOrganization?.name || 'None'}</Text>
        <Text>Active Role: {activeMembership?.role || 'None'}</Text>
        <Text>Is Officer: {isOfficer ? 'Yes' : 'No'}</Text>
        <Text>Is Member: {isMember ? 'Yes' : 'No'}</Text>
      </View>

      {/* Memberships */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memberships ({userMemberships.length})</Text>
        {userMemberships.map((membership, index) => (
          <Text key={membership.org_id} style={styles.membershipItem}>
            {index + 1}. {membership.org_name} - {membership.role}
            {membership.org_id === activeMembership?.org_id && ' (Active)'}
          </Text>
        ))}
      </View>

      {/* Multi-org Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Multi-Organization Support</Text>
        <Text>Has Multiple: {hasMultipleMemberships ? 'Yes' : 'No'}</Text>
        <Text>Can Switch: {canSwitchOrganizations ? 'Yes' : 'No'}</Text>
        
        {hasMultipleMemberships && (
          <TouchableOpacity style={styles.testButton} onPress={handleTestSwitch}>
            <Text style={styles.testButtonText}>Test Organization Switch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Auth Context Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth Context Sync</Text>
        <Text>Auth Memberships: {authMemberships.length}</Text>
        <Text>Org Memberships: {userMemberships.length}</Text>
        <Text>Synced: {authMemberships.length === userMemberships.length ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  membershipItem: {
    fontSize: 12,
    marginBottom: 4,
    color: '#6B7280',
  },
  testButton: {
    backgroundColor: '#2B5CE6',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default OrganizationContextTest;