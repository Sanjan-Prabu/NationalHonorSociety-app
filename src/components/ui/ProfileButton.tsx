import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import ProfileMenuModal from './ProfileMenuModal';

const Colors = {
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  white: '#FFFFFF',
};

interface ProfileButtonProps {
  color?: string;
  size?: number;
  style?: any;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  color = Colors.solidBlue,
  size = moderateScale(28),
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.profileButton, style]}
        onPress={handlePress}
        accessibilityLabel="Open profile menu"
        accessibilityRole="button"
      >
        <MaterialIcons 
          name="account-circle" 
          size={size} 
          color={color} 
        />
      </TouchableOpacity>

      <ProfileMenuModal
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileButton;