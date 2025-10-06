import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { handleAuthError, logAuthError } from '../utils/authErrorHandler';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'member' | 'officer';
  pending_officer?: boolean;
  organization: string;
  grade?: string;
  phone_number?: string;
  student_id?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
    const maxRetries = 3;
    const retryDelay = 1000;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logAuthError(error, 'fetchProfile');
        
        // Handle different types of errors
        const errorInfo = handleAuthError(error);
        
        if (errorInfo.shouldRetry && retryCount < maxRetries) {
          console.log(`Retrying profile fetch (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return fetchProfile(userId, retryCount + 1);
        }
        
        return null;
      }

      // Validate profile data
      if (!data || typeof data !== 'object') {
        console.error('Invalid profile data received:', data);
        return null;
      }

      // Ensure role is valid
      if (!data.role || (data.role !== 'officer' && data.role !== 'member')) {
        console.error('Invalid role in profile:', data.role);
        // Don't return null here - let the app handle invalid roles gracefully
        // Set a default role to prevent crashes
        data.role = 'member';
      }

      return data as Profile;
    } catch (error) {
      logAuthError(error, 'fetchProfile');
      
      // Handle different types of errors
      const errorInfo = handleAuthError(error);
      
      if (errorInfo.shouldRetry && retryCount < maxRetries) {
        console.log(`Retrying profile fetch due to error (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return fetchProfile(userId, retryCount + 1);
      }
      
      return null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      try {
        setError(null);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } catch (error) {
        const errorInfo = handleAuthError(error);
        setError(errorInfo.userMessage);
        logAuthError(error, 'refreshProfile');
      }
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    } catch (error) {
      logAuthError(error, 'signOut');
      // Even if sign out fails, clear local state
      setSession(null);
      setProfile(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Handle app state changes for session persistence
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && session) {
        // Refresh session when app becomes active
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (!currentSession && session) {
            // Session expired while app was in background
            setSession(null);
            setProfile(null);
            setError('Your session has expired. Please log in again.');
          }
        }).catch(error => {
          logAuthError(error, 'session refresh on app resume');
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [session]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user?.id) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user?.id) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    profile,
    isLoading,
    error,
    signOut,
    refreshProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};