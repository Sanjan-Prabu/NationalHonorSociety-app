import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  solidBlue: '#2B5CE6',
  white: '#FFFFFF',
};

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Icon name={icon} size={moderateScale(64)} color={Colors.textLight} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onActionPress && (
        <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Pre-built empty state components for common use cases
export const NoEventsEmptyState: React.FC<{ organizationName?: string; onRefresh?: () => void }> = ({
  organizationName,
  onRefresh,
}) => (
  <EmptyState
    icon="event-busy"
    title="No Events Found"
    description={`There are no upcoming events for ${organizationName || 'your organization'} at the moment. Check back later for new opportunities!`}
    actionText={onRefresh ? "Refresh" : undefined}
    onActionPress={onRefresh}
  />
);

export const NoAttendanceEmptyState: React.FC<{ organizationName?: string; onRefresh?: () => void }> = ({
  organizationName,
  onRefresh,
}) => (
  <EmptyState
    icon="history"
    title="No Attendance Records"
    description={`You haven't attended any events for ${organizationName || 'your organization'} yet. Join an event to see your attendance history here.`}
    actionText={onRefresh ? "Refresh" : undefined}
    onActionPress={onRefresh}
  />
);

export const NoVolunteerHoursEmptyState: React.FC<{ onAddHours?: () => void }> = ({
  onAddHours,
}) => (
  <EmptyState
    icon="volunteer-activism"
    title="No Volunteer Hours"
    description="You haven't logged any volunteer hours yet. Start making a difference in your community and track your impact here."
    actionText={onAddHours ? "Log Hours" : undefined}
    onActionPress={onAddHours}
  />
);

export const NetworkErrorEmptyState: React.FC<{ onRetry?: () => void }> = ({
  onRetry,
}) => (
  <EmptyState
    icon="wifi-off"
    title="Connection Error"
    description="Unable to load data. Please check your internet connection and try again."
    actionText={onRetry ? "Try Again" : undefined}
    onActionPress={onRetry}
  />
);

export const PermissionErrorEmptyState: React.FC<{ onContactSupport?: () => void }> = ({
  onContactSupport,
}) => (
  <EmptyState
    icon="lock"
    title="Access Restricted"
    description="You don't have permission to view this content. Contact your organization administrator if you believe this is an error."
    actionText={onContactSupport ? "Contact Support" : undefined}
    onActionPress={onContactSupport}
  />
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  description: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  actionButton: {
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
});

export default EmptyState;