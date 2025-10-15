import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { UserMembership } from '../../types/database';

interface OrganizationSwitcherProps {
  showLabel?: boolean;
  compact?: boolean;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  showLabel = true,
  compact = false,
}) => {
  const {
    activeOrganization,
    activeMembership,
    userMemberships,
    hasMultipleMemberships,
    switchOrganization,
    isLoading,
    error,
  } = useOrganization();

  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Don't show switcher if user doesn't have multiple memberships
  if (!hasMultipleMemberships) {
    return null;
  }

  const handleOrganizationSwitch = async (orgId: string) => {
    if (orgId === activeMembership?.org_id) {
      setModalVisible(false);
      return;
    }

    try {
      setSwitching(true);
      await switchOrganization(orgId);
      setModalVisible(false);
    } catch (error) {
      console.error('Error switching organization:', error);
      Alert.alert(
        'Switch Failed',
        'Failed to switch organization. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSwitching(false);
    }
  };

  const getOrganizationColor = (orgSlug: string): string => {
    const colors: Record<string, string> = {
      'nhs': '#2B5CE6',
      'nhsa': '#805AD5',
    };
    return colors[orgSlug.toLowerCase()] || '#6B7280';
  };

  return (
    <View>

      {/* Switcher Button */}
      <TouchableOpacity
        style={[styles.switcherButton, compact && styles.compactButton]}
        onPress={() => setModalVisible(true)}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {activeOrganization && (
            <View
              style={[
                styles.orgIndicator,
                { backgroundColor: getOrganizationColor(activeMembership?.org_slug || '') }
              ]}
            />
          )}
          <View style={styles.textContainer}>
            {showLabel && !compact && (
              <Text style={styles.label}>Organization</Text>
            )}
            <Text style={[styles.orgName, compact && styles.compactText]}>
              {activeOrganization?.name || 'Select Organization'}
            </Text>
          </View>
          <Icon 
            name="keyboard-arrow-down" 
            size={compact ? 16 : 20} 
            color="#6B7280" 
          />
        </View>
      </TouchableOpacity>

      {/* Organization Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Organization</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.organizationList}>
              {userMemberships.map((membership) => {
                const isActive = membership.org_id === activeMembership?.org_id;
                const orgColor = getOrganizationColor(membership.org_slug);

                return (
                  <TouchableOpacity
                    key={membership.org_id}
                    style={[
                      styles.organizationItem,
                      isActive && styles.activeOrganizationItem
                    ]}
                    onPress={() => handleOrganizationSwitch(membership.org_id)}
                    disabled={switching || isActive}
                  >
                    <View style={styles.organizationContent}>
                      <View
                        style={[styles.orgIndicator, { backgroundColor: orgColor }]}
                      />
                      <View style={styles.orgInfo}>
                        <Text style={[styles.orgItemName, isActive && styles.activeText]}>
                          {membership.org_name}
                        </Text>
                        <Text style={[styles.orgItemRole, isActive && styles.activeSubtext]}>
                          {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                        </Text>
                      </View>
                      {isActive && (
                        <Icon name="check" size={20} color={orgColor} />
                      )}
                      {switching && membership.org_id !== activeMembership?.org_id && (
                        <ActivityIndicator size="small" color={orgColor} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  switcherButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  orgName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  compactText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  organizationList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  organizationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeOrganizationItem: {
    backgroundColor: '#F3F4F6',
  },
  organizationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgInfo: {
    flex: 1,
    marginLeft: 8,
  },
  orgItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  orgItemRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  activeText: {
    color: '#374151',
  },
  activeSubtext: {
    color: '#4B5563',
  },
});

export default OrganizationSwitcher;