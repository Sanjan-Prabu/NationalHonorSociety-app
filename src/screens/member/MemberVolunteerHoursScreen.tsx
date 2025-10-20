import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserVolunteerHours, useDeleteVolunteerHours } from '../../hooks/useVolunteerHoursData';
import { useCurrentOrganizationId } from '../../hooks/useUserData';
import { useToast } from '../../components/ui/ToastProvider';
import LoadingScreen from '../../components/ui/LoadingScreen';
import VolunteerHourCard from '../../components/ui/VolunteerHourCard';
import { VolunteerHourData } from '../../types/dataService';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  lightBlue: '#EBF8FF',
  successGreen: '#38A169',
  warningYellow: '#ECC94B',
  dividerColor: '#E2E8F0',
  tabBackground: '#F7FAFC',
  tabActiveBackground: '#FFFFFF',
};

interface MemberVolunteerHoursScreenProps {
  navigation: any;
}

const MemberVolunteerHoursScreen: React.FC<MemberVolunteerHoursScreenProps> = ({ navigation }) => {
  const { activeOrganization, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const currentOrgId = useCurrentOrganizationId();

  // State for tab management
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => currentOrgId || activeOrganization?.id || '', [currentOrgId, activeOrganization?.id]);

  // Data hooks
  const { 
    data: volunteerHours, 
    isLoading: hoursLoading, 
    isError: hoursError,
    refetch: refetchHours 
  } = useUserVolunteerHours(user?.id, undefined);

  const deleteVolunteerHoursMutation = useDeleteVolunteerHours();

  // Filter volunteer hours by status
  const { pendingHours, approvedHours, rejectedHours } = useMemo(() => {
    if (!volunteerHours) {
      return { pendingHours: [], approvedHours: [], rejectedHours: [] };
    }

    return {
      pendingHours: volunteerHours.filter(hour => hour.status === 'pending'),
      approvedHours: volunteerHours.filter(hour => hour.status === 'approved'),
      rejectedHours: volunteerHours.filter(hour => hour.status === 'rejected'),
    };
  }, [volunteerHours]);

  // Calculate statistics
  const { totalApprovedHours, organizationEventHours } = useMemo(() => {
    const totalApproved = approvedHours.reduce((sum, hour) => sum + hour.hours, 0);
    const orgEventHours = approvedHours
      .filter(hour => hour.event_id) // Has event_id means it's an organization event
      .reduce((sum, hour) => sum + hour.hours, 0);

    return {
      totalApprovedHours: totalApproved,
      organizationEventHours: orgEventHours,
    };
  }, [approvedHours]);

  // Handle refresh
  const onRefresh = async () => {
    await refetchHours();
  };

  // Handle delete volunteer hours
  const handleDeleteVolunteerHours = async (hourId: string) => {
    try {
      await deleteVolunteerHoursMutation.mutateAsync(hourId);
      showSuccess('Success', 'Volunteer hours deleted successfully.');
    } catch (error) {
      console.error('Error deleting volunteer hours:', error);
      showError('Error', 'Failed to delete volunteer hours. Please try again.');
    }
  };

  // Handle navigation to form
  const handleAddVolunteerHours = () => {
    navigation.navigate('MemberVolunteerHoursForm');
  };

  if (orgLoading || hoursLoading) {
    return <LoadingScreen message="Loading volunteer hours..." />;
  }

  if (!activeOrganization || !user) {
    return (
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No organization selected</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (hoursError) {
    return (
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load volunteer hours</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Get current tab data
  const getCurrentTabData = (): VolunteerHourData[] => {
    switch (activeTab) {
      case 'pending':
        return [...pendingHours, ...rejectedHours]; // Include rejected in pending tab for management
      case 'approved':
        return approvedHours;
      default:
        return [];
    }
  };

  const currentTabData = getCurrentTabData();

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }
          ]}
          refreshControl={
            <RefreshControl 
              refreshing={deleteVolunteerHoursMutation.isPending} 
              onRefresh={onRefresh}
              tintColor={Colors.solidBlue}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={moderateScale(24)} color={Colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Volunteer Hours</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Progress Summary */}
          <View style={styles.progressContainer}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <View style={styles.progressStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{totalApprovedHours}</Text>
                  <Text style={styles.statLabel}>Total Hours</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{organizationEventHours}</Text>
                  <Text style={styles.statLabel}>NHS Events</Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${Math.min((totalApprovedHours / 40) * 100, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {totalApprovedHours}/40 hours goal
                </Text>
              </View>
            </View>
          </View>

          {/* Add Hours Button */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddVolunteerHours}
          >
            <Icon name="add" size={moderateScale(20)} color={Colors.white} />
            <Text style={styles.addButtonText}>Log New Hours</Text>
          </TouchableOpacity>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'pending' && styles.activeTab
              ]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'pending' && styles.activeTabText
              ]}>
                Pending Entries
              </Text>
              {(pendingHours.length + rejectedHours.length) > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {pendingHours.length + rejectedHours.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'approved' && styles.activeTab
              ]}
              onPress={() => setActiveTab('approved')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'approved' && styles.activeTabText
              ]}>
                Recently Approved
              </Text>
              {approvedHours.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{approvedHours.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {currentTabData.length > 0 ? (
              currentTabData.map((hour) => (
                <VolunteerHourCard
                  key={hour.id}
                  volunteerHour={hour}
                  onDelete={handleDeleteVolunteerHours}
                  showDeleteButton={activeTab === 'pending' && (hour.status === 'pending' || hour.status === 'rejected')}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon 
                  name={activeTab === 'pending' ? 'pending-actions' : 'check-circle-outline'} 
                  size={moderateScale(48)} 
                  color={Colors.textLight} 
                />
                <Text style={styles.emptyStateTitle}>
                  {activeTab === 'pending' 
                    ? 'No Pending Entries' 
                    : 'No Approved Hours Yet'
                  }
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {activeTab === 'pending'
                    ? 'Your submitted volunteer hours will appear here while awaiting officer approval.'
                    : 'Once officers approve your volunteer hours, they will appear here.'
                  }
                </Text>
                {activeTab === 'pending' && (
                  <TouchableOpacity 
                    style={styles.emptyStateButton} 
                    onPress={handleAddVolunteerHours}
                  >
                    <Text style={styles.emptyStateButtonText}>Log Your First Hours</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: Colors.textDark,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: scale(40),
  },
  progressContainer: {
    marginBottom: verticalScale(20),
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: scale(20),
    shadowColor: Colors.solidBlue,
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  progressTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: verticalScale(16),
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: verticalScale(40),
    backgroundColor: Colors.dividerColor,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: verticalScale(8),
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(4),
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(4),
  },
  progressText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: Colors.solidBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(24),
    shadowColor: Colors.solidBlue,
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBackground,
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(20),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(8),
  },
  activeTab: {
    backgroundColor: Colors.tabActiveBackground,
    shadowColor: Colors.solidBlue,
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  tabText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: Colors.textMedium,
  },
  activeTabText: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(10),
    minWidth: scale(20),
    height: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  tabBadgeText: {
    color: Colors.white,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(20),
  },
  emptyStateTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textMedium,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  emptyStateButton: {
    backgroundColor: Colors.solidBlue,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    borderRadius: moderateScale(8),
  },
  emptyStateButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: Colors.solidBlue,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
});

export default MemberVolunteerHoursScreen;