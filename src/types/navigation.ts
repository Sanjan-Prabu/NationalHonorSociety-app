import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root Stack Parameter List - Main navigation structure
export type RootStackParamList = {
  Auth: undefined;
  Loading: undefined;
  OrganizationSelection: undefined;
  Main: undefined;
  OfficerRoot: undefined;
  MemberRoot: undefined;
};

// Auth Stack Parameter List - Authentication screens
export type AuthStackParamList = {
  Landing: undefined;
  Login: { role?: 'member' | 'officer'; signupSuccess?: boolean } | undefined;
  Signup: { role: 'member' | 'officer' };
};

// Officer Stack Parameter List - Officer stack navigation
export type OfficerStackParamList = {
  OfficerTabs: undefined;
  AttendanceSession: undefined;
  EventAttendance: { eventId: string };
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
export type LandingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Landing'>;
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
export type OrganizationSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'OrganizationSelection'>;
export type OfficerRootProps = NativeStackScreenProps<RootStackParamList, 'OfficerRoot'>;
export type MemberRootProps = NativeStackScreenProps<RootStackParamList, 'MemberRoot'>;