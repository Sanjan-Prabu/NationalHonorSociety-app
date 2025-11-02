import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from '../../components/ui/ProfileButton';
import AnnouncementCard from '../../components/ui/AnnouncementCard';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAnnouncementData } from '../../hooks/useAnnouncementData';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
};

const MemberAnnouncementsScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Use the announcement data hook with realtime subscriptions
  const {
    announcements,
    loading,
    refreshAnnouncements,
  } = useAnnouncementData({
    enableRealtime: true, // Enable realtime updates for live feed
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAnnouncements();
    setRefreshing(false);
  };

  // Handle link press
  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  if (orgLoading) {
    return <LoadingScreen message="Loading announcements..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTextSimple}>No organization selected</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={styles.gradientContainer}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              }
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Announcements</Text>
                <Text style={styles.headerSubtitle}>{activeOrganization.name} Updates</Text>
              </View>
              <ProfileButton
                color={Colors.solidBlue}
                size={moderateScale(28)}
              />
            </View>

            {/* Announcements List */}
            {loading.isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading announcements...</Text>
              </View>
            ) : loading.isError ? (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.errorTitle}>Error Loading Announcements</Text>
                <Text style={styles.errorText}>
                  {loading.error?.message || 'Failed to load announcements'}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  showDeleteButton={false} // Members cannot delete announcements
                  onLinkPress={handleLinkPress}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="announcement" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Announcements</Text>
                <Text style={styles.emptyStateText}>
                  There are no announcements for {activeOrganization?.name} at this time.
                </Text>
              </View>
            )}


            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Navigation is handled by the main MemberBottomNavigator */}
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorTextSimple: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(30),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
  },
  profileButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },

  errorTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyStateTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default MemberAnnouncementsScreen;