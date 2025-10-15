import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionWrapper } from '../../components/ui/PermissionWrapper';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { VolunteerHours } from '../../types/database';
import { supabase } from '../../lib/supabaseClient';

const MemberVolunteerHoursScreen: React.FC = () => {
  const { activeOrganization, activeMembership, isLoading } = useOrganization();
  const { permissions } = useNavigation();
  const { profile, user } = useAuth();
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHours[]>([]);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalHours, setTotalHours] = useState(0);

  const fetchVolunteerHours = async () => {
    if (!activeOrganization || !user) return;

    try {
      setHoursLoading(true);
      
      // Fetch volunteer hours for this user and organization
      const { data, error } = await supabase
        .from('volunteer_hours')
        .select('*')
        .eq('org_id', activeOrganization.id)
        .eq('member_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching volunteer hours:', error);
      } else {
        setVolunteerHours(data || []);
        
        // Calculate total approved hours
        const approved = (data || []).filter(h => h.status === 'approved');
        const total = approved.reduce((sum, h) => sum + h.hours, 0);
        setTotalHours(total);
      }
    } catch (error) {
      console.error('Error fetching volunteer hours:', error);
    } finally {
      setHoursLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVolunteerHours();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchVolunteerHours();
  }, [activeOrganization, user]);

  if (isLoading) {
    return <LoadingScreen message="Loading volunteer hours..." />;
  }

  if (!activeOrganization || !activeMembership || !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'pending': return '#ffc107';
      case 'rejected': return '#dc3545';
      case 'needs_revision': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <PermissionWrapper requiredRole={['member']} requiredPermissions={['canViewVolunteerHours']}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Volunteer Hours</Text>
          <Text style={styles.subtitle}>{activeOrganization.name}</Text>
        </View>

        <View style={styles.content}>
          {/* Hours Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Progress</Text>
            <Text style={styles.totalHours}>{totalHours} Hours</Text>
            <Text style={styles.summarySubtext}>Total Approved Hours</Text>
          </View>

          {/* Log Hours Button */}
          <TouchableOpacity style={styles.logButton}>
            <Text style={styles.logButtonText}>+ Log New Hours</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            {volunteerHours.length > 0 ? 'Your Volunteer History' : 'No Hours Logged Yet'}
          </Text>
          
          {hoursLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading volunteer hours...</Text>
            </View>
          ) : volunteerHours.length > 0 ? (
            volunteerHours.map((hours) => (
              <View key={hours.id} style={styles.hoursCard}>
                <View style={styles.hoursHeader}>
                  <Text style={styles.hoursTitle}>
                    {hours.event_name || 'Volunteer Work'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(hours.status) }]}>
                    <Text style={styles.statusText}>{hours.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={styles.hoursDescription}>{hours.description}</Text>
                
                <View style={styles.hoursDetails}>
                  <Text style={styles.hoursAmount}>{hours.hours} hours</Text>
                  <Text style={styles.hoursDate}>📅 {formatDate(hours.date)}</Text>
                </View>
                
                {hours.approved_at && (
                  <Text style={styles.approvedText}>
                    ✅ Approved on {formatDate(hours.approved_at)}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noHoursContainer}>
              <Text style={styles.noHoursText}>
                You haven't logged any volunteer hours yet.
              </Text>
              <Text style={styles.noHoursSubtext}>
                Tap "Log New Hours" above to get started!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </PermissionWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2B5CE6',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 50,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalHours: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2B5CE6',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#888',
  },
  logButton: {
    backgroundColor: '#2B5CE6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  logButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  hoursCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  hoursDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  hoursDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B5CE6',
  },
  hoursDate: {
    fontSize: 14,
    color: '#666',
  },
  approvedText: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 8,
  },
  noHoursContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noHoursText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noHoursSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default MemberVolunteerHoursScreen;