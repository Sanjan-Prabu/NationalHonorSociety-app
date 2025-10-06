import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root Stack Parameter List - Main navigation structure
export type RootStackParamList = {
  Landing: undefined;
  Login: { role?: 'member' | 'officer'; signupSuccess?: boolean } | undefined;
  Signup: { role: 'member' | 'officer' };
  OfficerRoot: undefined;
  MemberRoot: undefined;
};

// Officer Tab Parameter List - Officer bottom tab navigation
export type OfficerTabParamList = {
  OfficerDashboard: undefined;
  OfficerAnnouncements: undefined;
  OfficerAttendance: undefined;
  OfficerVerifyHours: undefined;
  OfficerEvents: undefined;
};

// Member Tab Parameter List - Member bottom tab navigation
export type MemberTabParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  Attendance: undefined;
  LogHours: undefined;
  Events: undefined;
};

// Screen prop types for type safety
export type LandingScreenProps = NativeStackScreenProps<RootStackParamList, 'Landing'>;
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;
export type OfficerRootProps = NativeStackScreenProps<RootStackParamList, 'OfficerRoot'>;
export type MemberRootProps = NativeStackScreenProps<RootStackParamList, 'MemberRoot'>;