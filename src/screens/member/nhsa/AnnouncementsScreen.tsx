import React from 'react';
import PlaceholderScreen from '../../../components/ui/PlaceholderScreen';

const AnnouncementsScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="NHSA Announcements"
      description="View and manage NHSA-specific announcements and updates"
      organization="NHSA"
      todoItems={[
        'Display NHSA-specific announcements list',
        'Add filtering by NHSA announcement categories',
        'Implement read/unread status tracking',
        'Add push notification integration for NHSA updates',
        'Create announcement detail view',
        'Add search functionality for NHSA announcements',
        'Implement offline caching for announcements'
      ]}
    />
  );
};

export default AnnouncementsScreen;