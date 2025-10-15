import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import ProfileButton from './ProfileButton';

const Colors = {
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  white: '#FFFFFF',
  lightBlue: '#EBF8FF',
};

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showProfileButton?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  addButtonIcon?: keyof typeof MaterialIcons.glyphMap;
  rightComponent?: React.ReactNode;
  style?: any;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showProfileButton = true,
  showAddButton = false,
  onAddPress,
  addButtonIcon = 'add',
  rightComponent,
  style,
}) => {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        )}
      </View>
      
      <View style={styles.headerRight}>
        {showAddButton && onAddPress && (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={onAddPress}
            accessibilityLabel="Add new item"
            accessibilityRole="button"
          >
            <MaterialIcons 
              name={addButtonIcon} 
              size={moderateScale(24)} 
              color={Colors.solidBlue} 
            />
          </TouchableOpacity>
        )}
        
        {rightComponent}
        
        {showProfileButton && (
          <ProfileButton 
            color={Colors.solidBlue}
            size={moderateScale(28)}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(2),
  },
  addButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScreenHeader;