import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  skeletonBase: '#E1E5E9',
  skeletonHighlight: '#F2F4F6',
};

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = verticalScale(20),
  borderRadius = moderateScale(4),
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.skeletonBase, Colors.skeletonHighlight],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common use cases
export const EventCardSkeleton: React.FC = () => (
  <View style={styles.eventCardSkeleton}>
    <LoadingSkeleton width={scale(80)} height={verticalScale(24)} borderRadius={moderateScale(12)} />
    <LoadingSkeleton width="100%" height={verticalScale(20)} style={{ marginTop: verticalScale(12) }} />
    <LoadingSkeleton width="70%" height={verticalScale(16)} style={{ marginTop: verticalScale(8) }} />
    <View style={styles.eventDetailsSkeleton}>
      <LoadingSkeleton width="40%" height={verticalScale(14)} />
      <LoadingSkeleton width="35%" height={verticalScale(14)} />
    </View>
    <View style={styles.eventButtonsSkeleton}>
      <LoadingSkeleton width="45%" height={verticalScale(40)} borderRadius={moderateScale(8)} />
      <LoadingSkeleton width="45%" height={verticalScale(40)} borderRadius={moderateScale(8)} />
    </View>
  </View>
);

export const AttendanceCardSkeleton: React.FC = () => (
  <View style={styles.attendanceCardSkeleton}>
    <View style={styles.attendanceHeaderSkeleton}>
      <LoadingSkeleton width="60%" height={verticalScale(18)} />
      <LoadingSkeleton width="20%" height={verticalScale(14)} />
    </View>
    <LoadingSkeleton width="40%" height={verticalScale(14)} style={{ marginTop: verticalScale(8) }} />
    <View style={styles.attendanceStatusSkeleton}>
      <LoadingSkeleton width={scale(16)} height={scale(16)} borderRadius={scale(8)} />
      <LoadingSkeleton width="30%" height={verticalScale(14)} style={{ marginLeft: scale(8) }} />
    </View>
  </View>
);

export const VolunteerHoursFormSkeleton: React.FC = () => (
  <View style={styles.formSkeleton}>
    <LoadingSkeleton width="40%" height={verticalScale(18)} style={{ marginBottom: verticalScale(16) }} />
    <View style={styles.formFieldSkeleton}>
      <LoadingSkeleton width="30%" height={verticalScale(14)} style={{ marginBottom: verticalScale(8) }} />
      <LoadingSkeleton width="100%" height={verticalScale(52)} borderRadius={moderateScale(8)} />
    </View>
    <View style={styles.formFieldSkeleton}>
      <LoadingSkeleton width="25%" height={verticalScale(14)} style={{ marginBottom: verticalScale(8) }} />
      <LoadingSkeleton width="100%" height={verticalScale(52)} borderRadius={moderateScale(8)} />
    </View>
    <View style={styles.formFieldSkeleton}>
      <LoadingSkeleton width="35%" height={verticalScale(14)} style={{ marginBottom: verticalScale(8) }} />
      <LoadingSkeleton width="100%" height={verticalScale(100)} borderRadius={moderateScale(8)} />
    </View>
    <LoadingSkeleton width="100%" height={verticalScale(48)} borderRadius={moderateScale(8)} style={{ marginTop: verticalScale(24) }} />
  </View>
);

const styles = StyleSheet.create({
  eventCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8),
    elevation: 2,
  },
  eventDetailsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(12),
  },
  eventButtonsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
  },
  attendanceCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  attendanceHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceStatusSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
  },
  formSkeleton: {
    padding: scale(16),
  },
  formFieldSkeleton: {
    marginBottom: verticalScale(20),
  },
});

export default LoadingSkeleton;