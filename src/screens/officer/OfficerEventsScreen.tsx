// screens/OfficerEventsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import ProfileButton from 'components/ui/ProfileButton';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import EventCard from 'components/ui/EventCard';
import { useOfficerEvents } from 'hooks/useEventData';
import { useEventSubscriptions } from 'hooks/useEventSubscriptions';
import { useOrganization } from 'contexts/OrganizationContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OfficerStackParamList } from '../../types/navigation';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  white: '#FFFFFF',
  lightBlue: '#EBF8FF',
};

type OfficerEventsScreenNavigationProp = NativeStackNavigationProp<OfficerStackParamList, 'OfficerTabs'>;

interface OfficerEventsScreenProps {
  navigation: OfficerEventsScreenNavigationProp;
}

const OfficerEventScreen = ({ navigation }: OfficerEventsScreenProps) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic data hooks
  const { activeOrganization } = useOrganization();

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
    deleteEvent,
    deleteLoading,
    deleteError
  } = useOfficerEvents();

  // Setup realtime subscription for immediate event updates
  useEventSubscriptions(
    (payload) => {
      console.log('Event realtime update:', payload.eventType, payload.new?.title || payload.old?.title);
      // The useOfficerEvents hook will automatically handle the UI updates through its subscription
    },
    {
      enabled: !!activeOrganization,
      onError: (error) => {
        console.error('Event subscription error:', error);
      }
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchEvents();
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to create event screen
    navigation.navigate('CreateEvent');
  };

  const handleDeleteEvent = (eventId: string) => {
    // Find the event to get its title for the confirmation dialog
    const event = events.find(e => e.id === eventId);
    const eventTitle = event?.title || 'this event';

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteEvent(eventId);
              if (!success) {
                Alert.alert('Error', deleteError || 'Failed to delete event. Please try again.');
              }
              // The UI will be automatically updated by the realtime subscription
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ]
    );
  };



  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + verticalScale(80),
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Create Events</Text>
              <Text style={styles.headerSubtitle}>Manage Volunteer Opportunities</Text>
            </View>
            <View style={styles.headerRight}>
              <ProfileButton
                color={Colors.solidBlue}
                size={moderateScale(32)}
              />
            </View>
          </View>

          {/* Upcoming Events Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Organization Events</Text>

            {eventsLoading ? (
              // Loading state
              <>
                <LoadingSkeleton height={verticalScale(200)} style={{ marginBottom: verticalScale(16) }} />
                <LoadingSkeleton height={verticalScale(200)} style={{ marginBottom: verticalScale(16) }} />
              </>
            ) : eventsError ? (
              // Error state
              <EmptyState
                icon="error"
                title="Error Loading Events"
                description="Failed to load events. Please try again."
                actionText="Retry"
                onActionPress={refetchEvents}
              />
            ) : events && events.length > 0 ? (
              // Events list using EventCard components
              events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showDeleteButton={true}
                  onDelete={handleDeleteEvent}
                  deleteLoading={deleteLoading}
                />
              ))
            ) : (
              // Empty state
              <EmptyState
                icon="event-busy"
                title="No Events Created"
                description="Create your first event to get started with volunteer opportunities."
                actionText="Create First Event"
                onActionPress={handleCreateEvent}
              />
            )}
          </View>
        </ScrollView>

        {/* Create Event Floating Button */}
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleCreateEvent}>
          <Icon name="add" size={moderateScale(24)} color={Colors.white} />
        </TouchableOpacity>

        {/* Navigation is handled by the main OfficerBottomNavigator */}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
  },
  addButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(16),
  },
  sectionContainer: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(16),
  },


  floatingAddButton: {
    position: 'absolute',
    right: scale(20),
    bottom: verticalScale(50),
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(28),
    backgroundColor: Colors.solidBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 5,
  },
});

export default withRoleProtection(OfficerEventScreen, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});