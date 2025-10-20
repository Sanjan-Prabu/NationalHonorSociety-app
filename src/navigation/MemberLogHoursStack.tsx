import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MemberVolunteerHoursScreen from '../screens/member/MemberVolunteerHoursScreen';
import MemberVolunteerHoursForm from '../screens/member/MemberVolunteerHoursForm';

export type LogHoursStackParamList = {
  LogHoursMain: undefined;
  MemberVolunteerHoursForm: undefined;
};

const Stack = createNativeStackNavigator<LogHoursStackParamList>();

const MemberLogHoursStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="LogHoursMain" 
        component={MemberVolunteerHoursScreen} 
      />
      <Stack.Screen 
        name="MemberVolunteerHoursForm" 
        component={MemberVolunteerHoursForm} 
      />
    </Stack.Navigator>
  );
};

export default MemberLogHoursStack;