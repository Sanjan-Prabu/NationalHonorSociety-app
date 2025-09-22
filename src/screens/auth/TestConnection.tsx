import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { supabase } from 'lib/supabaseClient';

const TestConnection = () => {
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('users').select('*').limit(1);
      if (error) {
        console.log('Supabase error:', error.message);
      } else {
        console.log('Supabase data:', data);
      }
    };

    testConnection();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Check console for Supabase test results</Text>
    </View>
  );
};

export default TestConnection;
