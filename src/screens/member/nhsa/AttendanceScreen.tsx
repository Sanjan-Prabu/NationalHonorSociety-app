import React from 'react';
import PlaceholderScreen from '../../../components/ui/PlaceholderScreen';

const AttendanceScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="NHSA Attendance"
      description="Track and manage NHSA event attendance"
      organization="NHSA"
      todoItems={[
        'Display NHSA event attendance history',
        'Add QR code scanning for NHSA event check-in',
        'Implement attendance verification system',
        'Show NHSA attendance requirements and progress',
        'Add manual attendance entry for NHSA events',
        'Create attendance reports and analytics',
        'Integrate with NHSA-specific attendance policies'
      ]}
    />
  );
};

export default AttendanceScreen;