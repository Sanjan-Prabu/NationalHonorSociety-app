/**
 * Event Data Integration Example
 * Demonstrates how to use the EventDataService, hooks, and real-time subscriptions
 * This example shows the complete integration pattern for event management
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  useOrganizationEvents, 
  useEventDetails, 
  useCreateEvent, 
  useUpdateEvent, 
  useDeleteEvent,
  useMarkAttendance 
} from '../hooks/useEventData';
import { useEventSubscription } from '../hooks/useEventSubscriptions';
import { useCurrentOrganizationId } from '../hooks/useUserData';
import { CreateEventRequest, UpdateEventRequest } from '../types/dataService';

const EventDataIntegrationExample: React.FC = () => {
  const currentOrgId = useCurrentOrganizationId();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // =============================================================================
  // DATA HOOKS
  // =============================================================================

  // Fetch organization events with caching
  const { 
    data: events, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useOrganizationEvents(currentOrgId || '', {
    startDate: new Date().toISOString(), // Only upcoming events
  });

  // Fetch selected event details
  const { 
    data: selectedEvent, 
    isLoading: eventLoading 
  } = useEventDetails(selectedEventId || '');

  // =============================================================================
  // MUTATION HOOKS
  // =============================================================================

  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const markAttendanceMutation = useMarkAttendance();

  // =============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================================================

  // Subscribe to real-time event updates
  const { isSubscribed } = useEventSubscription({
    orgId: currentOrgId || '',
    enabled: !!currentOrgId,
    onEventCreated: (event) => {
      Alert.alert('New Event', `"${event.title}" has been created!`);
    },
    onEventUpdated: (event) => {
      Alert.alert('Event Updated', `"${event.title}" has been updated!`);
    },
    onEventDeleted: (eventId) => {
      Alert.alert('Event Deleted', 'An event has been deleted.');
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
    },
  });

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleCreateEvent = async () => {
    if (!currentOrgId) return;

    const newEvent: CreateEventRequest = {
      title: 'Sample Event',
      description: 'This is a sample event created from the integration example',
      location: 'Community Center',
      starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      is_public: true,
      volunteer_hours: 2,
    };

    try {
      await createEventMutation.mutateAsync({ eventData: newEvent, orgId: currentOrgId });
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
      console.error('Create event error:', error);
    }
  };

  const handleUpdateEvent = async (eventId: string) => {
    const updates: UpdateEventRequest = {
      title: 'Updated Event Title',
      description: 'This event has been updated through the integration example',
    };

    try {
      await updateEventMutation.mutateAsync({ eventId, updates });
      Alert.alert('Success', 'Event updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
      console.error('Update event error:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventMutation.mutateAsync(eventId);
              Alert.alert('Success', 'Event deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
              console.error('Delete event error:', error);
            }
          },
        },
      ]
    );
  };

  const handleMarkAttendance = async (eventId: string) => {
    try {
      await markAttendanceMutation.mutateAsync({ 
        eventId, 
        method: 'manual' 
      });
      Alert.alert('Success', 'Attendance marked successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
      console.error('Mark attendance error:', error);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!currentOrgId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No organization context available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Event Data Integration Example</Text>
      
      {/* Subscription Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Real-time Subscription: {isSubscribed ? '✅ Active' : '❌ Inactive'}
        </Text>
        <Text style={styles.statusText}>
          Organization ID: {currentOrgId}
        </Text>
      </View>

      {/* Create Event Button */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCreateEvent}
        disabled={createEventMutation.isPending}
      >
        <Text style={styles.buttonText}>
          {createEventMutation.isPending ? 'Creating...' : 'Create Sample Event'}
        </Text>
      </TouchableOpacity>

      {/* Events List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        
        {eventsLoading && <Text style={styles.loadingText}>Loading events...</Text>}
        
        {eventsError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading events</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetchEvents}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {events && events.length === 0 && (
          <Text style={styles.emptyText}>No upcoming events</Text>
        )}

        {events?.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDetails}>
              📍 {event.location} • 👥 {event.attendee_count} attending
            </Text>
            <Text style={styles.eventDate}>
              {event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'TBD'}
            </Text>
            
            <View style={styles.eventActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setSelectedEventId(event.id)}
              >
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleUpdateEvent(event.id)}
                disabled={updateEventMutation.isPending}
              >
                <Text style={styles.actionButtonText}>Update</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleMarkAttendance(event.id)}
                disabled={markAttendanceMutation.isPending}
              >
                <Text style={styles.actionButtonText}>Mark Attendance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteEvent(event.id)}
                disabled={deleteEventMutation.isPending}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Selected Event Details */}
      {selectedEventId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          {eventLoading && <Text style={styles.loadingText}>Loading event details...</Text>}
          
          {selectedEvent && (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>{selectedEvent.title}</Text>
              <Text style={styles.detailsText}>
                Description: {selectedEvent.description || 'No description'}
              </Text>
              <Text style={styles.detailsText}>
                Location: {selectedEvent.location || 'TBD'}
              </Text>
              <Text style={styles.detailsText}>
                Attendees: {selectedEvent.attendee_count || 0}
              </Text>
              <Text style={styles.detailsText}>
                Status: {selectedEvent.user_attendance_status || 'unknown'}
              </Text>
              <Text style={styles.detailsText}>
                Created by: {selectedEvent.creator_name || 'Unknown'}
              </Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSelectedEventId(null)}
              >
                <Text style={styles.closeButtonText}>Close Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Mutation Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operation Status</Text>
        <Text style={styles.statusText}>
          Create Event: {createEventMutation.isPending ? 'Loading...' : 'Ready'}
        </Text>
        <Text style={styles.statusText}>
          Update Event: {updateEventMutation.isPending ? 'Loading...' : 'Ready'}
        </Text>
        <Text style={styles.statusText}>
          Delete Event: {deleteEventMutation.isPending ? 'Loading...' : 'Ready'}
        </Text>
        <Text style={styles.statusText}>
          Mark Attendance: {markAttendanceMutation.isPending ? 'Loading...' : 'Ready'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loadingText: {
    fontStyle: 'italic',
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#1976d2',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    color: '#d32f2f',
  },
  detailsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 14,
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#666',
  },
});

export default EventDataIntegrationExample;