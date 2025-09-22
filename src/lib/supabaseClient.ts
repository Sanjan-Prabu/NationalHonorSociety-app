import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Access EXPO_PUBLIC_ environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// DEBUG: Log all the attempts
console.log('🔍 DEBUG - All Constants:', {
  expoConfig: Constants.expoConfig?.extra,
  manifest: Constants.manifest?.extra,
  processEnv: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
  }
});
console.log('🔍 DEBUG - Final values:', {
  supabaseUrl: supabaseUrl ? 'EXISTS' : 'MISSING',
  supabaseAsupabaseKeyonKey: supabaseKey ? 'EXISTS' : 'MISSING'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('supabaseUrl:', supabaseUrl);
  console.error('supabaseAnonKey:', supabaseKey ? 'EXISTS' : 'MISSING');
  throw new Error('Missing Supabase environment variables. Please check your .env file and restart Expo.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});