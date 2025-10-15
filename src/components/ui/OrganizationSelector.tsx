import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { UserMembership } from '../../types/database';

interface OrganizationSelectorProps {
  memberships: UserMembership[];
  onSelect: (orgId: string) => void;
  currentOrgId?: string;
  title?: string;
  subtitle?: string;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  memberships,
  onSelect,
  currentOrgId,
  title = "Select Organization",
  subtitle = "Choose which organization you'd like to access"
}) => {
  const getOrganizationColor = (orgSlug: string): string => {
    const colors: Record<string, string> = {
      'nhs': '#2B5CE6',
      'nhsa': '#805AD5',
    };
    return colors[orgSlug.toLowerCase()] || '#6B7280';
  };

  const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
      'member': 'Member',
      'officer': 'Officer',
      'president': 'President',
      'vice_president': 'Vice President',
      'admin': 'Administrator',
    };
    return roleNames[role] || role;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <ScrollView style={styles.organizationList} showsVerticalScrollIndicator={false}>
          {memberships.map((membership) => {
            const isSelected = membership.org_id === currentOrgId;
            const orgColor = getOrganizationColor(membership.org_slug);

            return (
              <TouchableOpacity
                key={membership.org_id}
                style={[
                  styles.organizationCard,
                  isSelected && styles.selectedCard,
                  { borderLeftColor: orgColor }
                ]}
                onPress={() => onSelect(membership.org_id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.organizationInfo}>
                    <Text style={[styles.organizationName, isSelected && styles.selectedText]}>
                      {membership.org_name}
                    </Text>
                    <Text style={[styles.organizationSlug, isSelected && styles.selectedSubtext]}>
                      {membership.org_slug.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.roleInfo}>
                    <View style={[styles.roleBadge, { backgroundColor: orgColor }]}>
                      <Text style={styles.roleText}>
                        {getRoleDisplayName(membership.role)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.joinedDate, isSelected && styles.selectedSubtext]}>
                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can switch between organizations at any time from your profile.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  organizationList: {
    flex: 1,
  },
  organizationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedCard: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  organizationSlug: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedText: {
    color: '#374151',
  },
  selectedSubtext: {
    color: '#4B5563',
  },
  roleInfo: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  joinedDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OrganizationSelector;