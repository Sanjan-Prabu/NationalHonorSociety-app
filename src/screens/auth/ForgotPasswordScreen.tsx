import React from 'react';
import PlaceholderScreen from '../../components/ui/PlaceholderScreen';

const ForgotPasswordScreen: React.FC = () => {
  return (
    <PlaceholderScreen
      title="Forgot Password"
      description="Password reset functionality for NHS/NHSA members and officers"
      todoItems={[
        'Implement email input field with validation',
        'Add Supabase password reset integration',
        'Create success/error message handling',
        'Add navigation back to login screen',
        'Implement rate limiting for reset requests',
        'Add email verification flow',
        'Style according to existing auth screen patterns'
      ]}
    />
  );
};

export default ForgotPasswordScreen;