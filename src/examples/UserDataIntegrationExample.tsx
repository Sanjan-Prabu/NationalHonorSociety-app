/**
 * Example of how to use the new UserDataService and hooks
 * This demonstrates the integration of dynamic user profile data
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { 
  useUserProfile, 
  useUserRole, 
  useOrganizationContext, 
  usePermissions,
  useUpdateUserProfile 
} from '../hooks/useUserData';

export const UserDataIntegrationExample: React.FC = () => {
  // Use the new hooks for dynamic data
  const { data: userProfile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: orgContext, isLoading: orgLoading } = useOrganizationContext();
  const permissions = usePermissions();
  const updateProfileMutation = useUpdateUserProfile();

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      display_name: 'Updated Display Name',
      first_name: 'Updated First Name',
    });
  };

  if (profileLoading || roleLoading || orgLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {profileError.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dynamic User Data Integration</Text>
      
      {/* User Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile</Text>
        <Text>Name: {userProfile?.full_name || 'Unknown'}</Text>
        <Text>Email: {userProfile?.email || 'Unknown'}</Text>
        <Text>Display Name: {userProfile?.display_name || 'Unknown'}</Text>
        <Text>Verified: {userProfile?.is_verified ? 'Yes' : 'No'}</Text>
        <Text>Student ID: {userProfile?.student_id || 'Not set'}</Text>
        <Text>Grade: {userProfile?.grade || 'Not set'}</Text>
      </View>

      {/* Role Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role Information</Text>
        <Text>Role: {userRole?.role || 'Unknown'}</Text>
        <Text>Organization ID: {userRole?.orgId || 'Unknown'}</Text>
        <Text>Valid: {userRole?.isValid ? 'Yes' : 'No'}</Text>
      </View>

      {/* Organization Context */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organization Context</Text>
        <Text>Current Org: {orgContext?.currentOrgName || 'Unknown'}</Text>
        <Text>Org Slug: {orgContext?.currentOrgSlug || 'Unknown'}</Text>
        <Text>Current Role: {orgContext?.currentRole || 'Unknown'}</Text>
        <Text>Multiple Orgs: {orgContext?.hasMultipleOrgs ? 'Yes' : 'No'}</Text>
        <Text>Total Memberships: {orgContext?.memberships?.length || 0}</Text>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <Text>Can Manage Events: {permissions.canManageEvents ? 'Yes' : 'No'}</Text>
        <Text>Can Approve Hours: {permissions.canApproveVolunteerHours ? 'Yes' : 'No'}</Text>
        <Text>Can Manage Members: {permissions.canManageMembers ? 'Yes' : 'No'}</Text>
        <Text>Is Officer: {permissions.isOfficer ? 'Yes' : 'No'}</Text>
        <Text>Can Access Officer Features: {permissions.canAccessOfficerFeatures ? 'Yes' : 'No'}</Text>
      </View>

      {/* Update Profile Example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Update</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleUpdateProfile}
          disabled={updateProfileMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
          </Text>
        </TouchableOpacity>
        
        {updateProfileMutation.isError && (
          <Text style={styles.errorText}>
            Update failed: {updateProfileMutation.error?.message}
          </Text>
        )}
        
        {updateProfileMutation.isSuccess && (
          <Text style={styles.successText}>Profile updated successfully!</Text>
        )}
      </View>

      {/* Organization Memberships */}
      {orgContext?.memberships && orgContext.memberships.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Memberships</Text>
          {orgContext.memberships.map((membership, index) => (
            <View key={membership.org_id} style={styles.membershipItem}>
              <Text>#{index + 1}: {membership.org_name}</Text>
              <Text>Role: {membership.role}</Text>
              <Text>Active: {membership.is_active ? 'Yes' : 'No'}</Text>
              <Text>Joined: {new Date(membership.joined_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066cc',
  },
  membershipItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginBottom: 8,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 10,
  },
  successText: {
    color: '#28a745',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default UserDataIntegrationExample;