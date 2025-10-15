import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileButton from './ProfileButton';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
  todoItems?: string[];
  organization?: 'NHS' | 'NHSA';
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  description,
  todoItems = [],
  organization = 'NHS'
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with ProfileButton */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.organization}>{organization}</Text>
          </View>
          <ProfileButton 
            color="#2B5CE6"
            size={28}
          />
        </View>
        
        {description && (
          <View style={styles.section}>
            <Text style={styles.description}>{description}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚧 Under Development</Text>
          <Text style={styles.sectionText}>
            This screen is a placeholder and will be implemented in a future update.
          </Text>
        </View>
        
        {todoItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 TODO Items</Text>
            {todoItems.map((item, index) => (
              <Text key={index} style={styles.todoItem}>
                • {item}
              </Text>
            ))}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Implementation Notes</Text>
          <Text style={styles.sectionText}>
            When implementing this screen, ensure it follows the existing app patterns:
          </Text>
          <Text style={styles.todoItem}>• Use NativeWind for styling consistency</Text>
          <Text style={styles.todoItem}>• Integrate with existing Supabase data models</Text>
          <Text style={styles.todoItem}>• Follow role-based access control patterns</Text>
          <Text style={styles.todoItem}>• Include proper error handling and loading states</Text>
          <Text style={styles.todoItem}>• Add appropriate navigation and user interactions</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  organization: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    textAlign: 'center',
  },
  todoItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default PlaceholderScreen;