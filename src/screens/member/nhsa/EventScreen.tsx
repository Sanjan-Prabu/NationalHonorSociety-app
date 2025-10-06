import React from 'react';
import PlaceholderScreen from '../../../components/ui/PlaceholderScreen';

const EventScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="NHSA Events"
      description="Browse and register for NHSA events and activities"
      organization="NHSA"
      todoItems={[
        'Display NHSA events calendar and list view',
        'Add NHSA event registration functionality',
        'Implement event filtering by NHSA categories',
        'Create event detail view with NHSA-specific information',
        'Add event reminder and notification system',
        'Implement RSVP tracking for NHSA events',
        'Add integration with NHSA event management system'
      ]}
    />
  );
};

export default EventScreen;