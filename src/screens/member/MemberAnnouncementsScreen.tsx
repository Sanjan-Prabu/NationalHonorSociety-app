import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from '../../components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabaseClient';

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
  interface Announcement {
    id: number | string;
    type: string;
    date: string;
    title: string;
    content: string;
    image?: string;
  }

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // Fetch announcements data filtered by organizationId
  const fetchAnnouncements = async () => {
    if (!activeOrganization?.id) return;

    try {
      setAnnouncementsLoading(true);

      // Fetch announcements from events table with type='announcement' filtered by org_id
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('org_id', activeOrganization.id)
        .eq('event_type', 'announcement')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
      } else {
        // Transform database data to match announcement interface
        const transformedAnnouncements = (data || []).map(announcement => ({
          id: announcement.id,
          type: announcement.category || 'Announcement',
          date: new Date(announcement.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }),
          title: announcement.title || announcement.name,
          content: announcement.description || '',
          image: announcement.image_caption,
        }));

        setAnnouncements(transformedAnnouncements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [activeOrganization]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  if (orgLoading) {
    return <LoadingScreen message="Loading announcements..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
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
            {announcementsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading announcements...</Text>
              </View>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <View style={styles.announcementHeader}>
                    <Text style={styles.announcementType}>{announcement.type}</Text>
                    <Text style={styles.announcementDate}>{announcement.date}</Text>
                  </View>

                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementContent}>{announcement.content}</Text>

                  {announcement.image && (
                    <Text style={styles.announcementImageCaption}>{announcement.image}</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="announcement" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Announcements</Text>
                <Text style={styles.emptyStateText}>
                  There are no announcements for {activeOrganization.name} at this time.
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
  errorText: {
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
  announcementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  announcementType: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  announcementDate: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  announcementTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  announcementContent: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  announcementImageCaption: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontStyle: 'italic',
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