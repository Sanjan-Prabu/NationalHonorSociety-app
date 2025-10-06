import React from 'react';
import PlaceholderScreen from '../../../components/ui/PlaceholderScreen';

const LogHoursScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="Log NHSA Hours"
      description="Log and track NHSA service hours and activities"
      organization="NHSA"
      todoItems={[
        'Create NHSA service hours logging form',
        'Add NHSA-specific activity categories',
        'Implement photo upload for hour verification',
        'Add supervisor contact information fields',
        'Create hours submission and approval workflow',
        'Display NHSA hours history and totals',
        'Integrate with NHSA hour requirements tracking'
      ]}
    />
  );
};

export default LogHoursScreen;