import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { requestAllPermissions, explainPermissionStatus } from '../utils/requestIOSPermissions';

export const RequestPermissionsButton: React.FC = () => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      const status = await requestAllPermissions();
      const message = explainPermissionStatus(status);
      
      Alert.alert('Permission Status', message);
    } catch (error: any) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions: ' + error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleRequestPermissions}
      disabled={isRequesting}
    >
      {isRequesting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Request Permissions</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
