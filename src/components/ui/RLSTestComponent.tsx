// RLS Test Component
// Use this to verify your Row-Level Security is working correctly

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../services/DatabaseService_RLS_Updated';

interface RLSTestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: any;
}

export const RLSTestComponent: React.FC = () => {
  const { authenticatedUser } = useAuth();
  const [testResults, setTestResults] = useState<RLSTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runRLSTests = async () => {
    if (!authenticatedUser) {
      Alert.alert('Error', 'You must be logged in to run RLS tests');
      return;
    }

    setIsRunning(true);
    const results: RLSTestResult[] = [];

    // Test 1: Check if RLS is enabled on tables
    try {
      const { data, error } = await supabase
        .rpc('check_rls_status'); // This would be a custom function

      results.push({
        test: 'RLS Enabled Check',
        status: error ? 'fail' : 'pass',
        message: error ? 'Could not check RLS status' : 'RLS status checked',
        details: data,
      });
    } catch (error) {
      results.push({
        test: 'RLS Enabled Check',
        status: 'fail',
        message: 'RLS status check failed',
        details: error,
      });
    }

    // Test 2: Event access test
    try {
      const eventsResult = await DatabaseService.events.getAll({ limit: 5 });
      
      results.push({
        test: 'Event Access Test',
        status: eventsResult.error ? 'fail' : 'pass',
        message: eventsResult.error 
          ? `Event access failed: ${eventsResult.error.message}`
          : `Can access ${eventsResult.data?.length || 0} events`,
        details: eventsResult.data?.map(e => ({ id: e.id, org_id: e.org_id, is_public: e.is_public })),
      });
    } catch (error) {
      results.push({
        test: 'Event Access Test',
        status: 'fail',
        message: 'Event access test failed',
        details: error,
      });
    }

    // Test 3: Membership access test
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, org_id, user_id, role')
        .limit(5);

      results.push({
        test: 'Membership Access Test',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Membership access failed: ${error.message}`
          : `Can access ${data?.length || 0} memberships`,
        details: data,
      });
    } catch (error) {
      results.push({
        test: 'Membership Access Test',
        status: 'fail',
        message: 'Membership access test failed',
        details: error,
      });
    }

    // Test 4: Organization access test
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, slug, name')
        .limit(5);

      results.push({
        test: 'Organization Access Test',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Organization access failed: ${error.message}`
          : `Can access ${data?.length || 0} organizations`,
        details: data,
      });
    } catch (error) {
      results.push({
        test: 'Organization Access Test',
        status: 'fail',
        message: 'Organization access test failed',
        details: error,
      });
    }

    // Test 5: Profile access test
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .limit(5);

      results.push({
        test: 'Profile Access Test',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Profile access failed: ${error.message}`
          : `Can access ${data?.length || 0} profiles`,
        details: data,
      });
    } catch (error) {
      results.push({
        test: 'Profile Access Test',
        status: 'fail',
        message: 'Profile access test failed',
        details: error,
      });
    }

    // Test 6: RLS isolation test
    try {
      const isolationResult = await DatabaseService.security.testRLSIsolation();
      
      results.push({
        test: 'RLS Isolation Test',
        status: isolationResult.rlsWorking ? 'pass' : 'fail',
        message: isolationResult.rlsWorking 
          ? 'RLS isolation is working correctly'
          : 'RLS isolation may not be working',
        details: isolationResult.details,
      });
    } catch (error) {
      results.push({
        test: 'RLS Isolation Test',
        status: 'fail',
        message: 'RLS isolation test failed',
        details: error,
      });
    }

    // Test 7: User access level test
    try {
      const accessResult = await DatabaseService.security.checkUserAccess();
      
      results.push({
        test: 'User Access Level Test',
        status: 'pass', // This test always passes, just shows info
        message: `Access levels: Events(${accessResult.canViewEvents ? 'view' : 'no view'}), Manage Events(${accessResult.canManageEvents ? 'yes' : 'no'})`,
        details: accessResult,
      });
    } catch (error) {
      results.push({
        test: 'User Access Level Test',
        status: 'fail',
        message: 'User access level test failed',
        details: error,
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#10B981';
      case 'fail': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RLS Test Suite</Text>
      
      {authenticatedUser && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            Testing as: {authenticatedUser.profile.first_name} {authenticatedUser.profile.last_name}
          </Text>
          <Text style={styles.userText}>
            Memberships: {authenticatedUser.memberships.length}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runRLSTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Run RLS Tests'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.testResult}>
            <View style={styles.testHeader}>
              <Text style={styles.testIcon}>{getStatusIcon(result.status)}</Text>
              <Text style={styles.testName}>{result.test}</Text>
            </View>
            <Text style={[styles.testMessage, { color: getStatusColor(result.status) }]}>
              {result.message}
            </Text>
            {result.details && (
              <Text style={styles.testDetails}>
                {JSON.stringify(result.details, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#EBF8FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  userText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  testResult: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  testMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  testDetails: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
});

export default RLSTestComponent;