import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// CRITICAL FIX: Use Constants.expoConfig for production builds
// process.env doesn't work in production iOS builds!
const expoExtra = Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || {};

// Try multiple sources for the configuration
const supabaseUrl = 
  expoExtra.supabaseUrl || 
  expoExtra.SUPABASE_URL ||
  process.env?.EXPO_PUBLIC_SUPABASE_URL || 
  'https://lncrggkgvstvlmrlykpi.supabase.co';

const supabaseKey = 
  expoExtra.supabaseAnonKey ||
  expoExtra.SUPABASE_ANON_KEY ||
  process.env?.EXPO_PUBLIC_SUPABASE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3JnZ2tndnN0dmxtcmx5a3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc1OTksImV4cCI6MjA3MzgzMzU5OX0.m605pLqr_Ie9a8jPT18MlPFH8CWRJArZTddABiSq5Yc';

console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');
console.log('  Source:', expoExtra.supabaseUrl || expoExtra.SUPABASE_URL ? 'expo-constants' : 'hardcoded');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('supabaseUrl:', supabaseUrl);
  console.error('supabaseAnonKey:', supabaseKey ? 'EXISTS' : 'MISSING');
  throw new Error('Missing Supabase environment variables. Please check your .env file and restart Expo.');
}

// Create Supabase client with error handling
let supabase: ReturnType<typeof createClient>;

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  throw error;
}

export { supabase };