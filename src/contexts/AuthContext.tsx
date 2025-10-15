import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile, AuthenticatedUser } from '../types/auth';
import { UserMembership } from '../types/database';
import { OrganizationService } from '../services/OrganizationService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userMemberships: UserMembership[];
  authenticatedUser: AuthenticatedUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  forceLogout: (reason?: string) => Promise<void>;
  resetAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed authenticated user object
  const authenticatedUser: AuthenticatedUser | null = session && profile ? {
    user: session.user,
    profile,
    memberships: userMemberships,
    currentMembership: userMemberships[0] || null, // Use first membership as current
  } : null;

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log(`👤 Fetching profile for user ${userId}`);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        if (error.code === 'PGRST116') {
          console.log('❌ Profile not found in database');

          // Try to create a basic profile for this user
          console.log('🔧 Attempting to create basic profile...');

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const newProfile = {
              id: userId,
              email: user.email,
              first_name: '',
              last_name: '',
              phone_number: null,
              student_id: null,
              grade: null,
              verification_code: null,
              is_verified: false,
              username: null,
              display_name: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (createError) {
              console.error('Failed to create profile:', createError);
              return null;
            }

            console.log('✅ Basic profile created successfully');
            return createdProfile;
          }

          return null;
        }
        throw error;
      }

      console.log('✅ Profile fetched successfully');
      return data;
    } catch (error) {
      console.error('Profile fetch failed:', error);
      return null;
    }
  };

  const fetchMemberships = async (userId: string): Promise<UserMembership[]> => {
    try {
      console.log(`👥 Fetching memberships for user ${userId}`);
      const memberships = await OrganizationService.getUserMemberships(userId);
      console.log(`✅ Found ${memberships.length} memberships`);
      return memberships;
    } catch (error) {
      console.error('Memberships fetch failed:', error);
      return [];
    }
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;

    const profileData = await fetchProfile(session.user.id);
    setProfile(profileData);
  };

  const refreshMemberships = async () => {
    if (!session?.user?.id) return;

    const memberships = await fetchMemberships(session.user.id);
    setUserMemberships(memberships);
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting fast logout...');

      // Clear local state immediately for fast response
      setSession(null);
      setProfile(null);
      setUserMemberships([]);
      setError(null);
      setIsLoading(false);
      setIsInitialized(true); // Keep initialized true to prevent re-initialization

      // Clear any loading timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Do cleanup in background without blocking UI
      Promise.resolve().then(async () => {
        try {
          await supabase.auth.signOut();
          console.log('✅ Background signout completed');
        } catch (error) {
          console.error('Background signout failed:', error);
        }
      });

      console.log('✅ Fast logout completed');
    } catch (error) {
      console.error('Signout error:', error);
      // Even if sign out fails, clear local state
      setSession(null);
      setProfile(null);
      setUserMemberships([]);
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const resetAuthState = () => {
    console.log('🔄 Resetting auth state');
    setSession(null);
    setProfile(null);
    setUserMemberships([]);
    setError(null);
    setIsLoading(false);
    setIsInitialized(true);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const forceLogout = async (reason?: string) => {
    console.log('🚨 Force logout triggered:', reason || 'Unknown reason');

    try {
      // Clear local state immediately
      setSession(null);
      setProfile(null);
      setUserMemberships([]);
      setError(null);
      setIsLoading(false);

      // Clear any stored tokens/sessions
      await supabase.auth.signOut();

      console.log('✅ Force logout completed');
    } catch (error) {
      console.error('Error during force logout:', error);
      // Even if signout fails, clear local state
      setSession(null);
      setProfile(null);
      setUserMemberships([]);
      setIsLoading(false);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Set up loading timeout only for initialization, not for login
    const setInitializationTimeout = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        if (mounted && isLoading && !isInitialized) {
          console.log('⏰ Initialization timeout reached, forcing completion');
          setIsLoading(false);
          setIsInitialized(true);
        }
      }, 10000); // 10 second timeout only for initialization
    };

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing authentication...');
        setIsLoading(true);
        setError(null);

        // Set initialization timeout
        setInitializationTimeout();

        // Set a timeout to prevent infinite loading during initialization
        timeoutId = setTimeout(() => {
          if (mounted && !isInitialized) {
            console.log('🚨 Auth initialization timeout, forcing logout');
            forceLogout('Initialization timeout');
          }
        }, 12000); // 12 second timeout for initialization

        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          setSession(null);
          setProfile(null);
          setUserMemberships([]);
        } else if (currentSession) {
          console.log('📡 Found current session');
          setSession(currentSession);

          // Fetch profile and memberships
          const [profileData, memberships] = await Promise.all([
            fetchProfile(currentSession.user.id),
            fetchMemberships(currentSession.user.id)
          ]);

          if (!mounted) return;

          // Validate session is still valid and user is verified
          const now = Date.now() / 1000;
          const sessionExpired = currentSession.expires_at && currentSession.expires_at < now;

          if (sessionExpired) {
            console.log('🚨 Session expired, forcing logout');
            await forceLogout('Session expired');
            return;
          }

          // Check if user email is confirmed
          if (!currentSession.user.email_confirmed_at) {
            console.log('🚨 User email not confirmed, forcing logout');
            await forceLogout('Email not confirmed');
            return;
          }

          if (profileData) {
            setProfile(profileData);
            setUserMemberships(memberships);
            console.log('✅ Auth initialization completed successfully');
          } else {
            console.log('⚠️ Profile not found but session is valid, continuing with limited functionality');
            // Don't force logout immediately - let the user continue and try to create profile later
            setProfile(null);
            setUserMemberships(memberships || []);
          }
        } else {
          console.log('ℹ️ No session found');
          setSession(null);
          setProfile(null);
          setUserMemberships([]);
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (mounted) {
          setSession(null);
          setProfile(null);
          setUserMemberships([]);
          setError(null); // Don't show error on initialization failure
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setIsLoading(false);
          setIsInitialized(true);
          console.log('🏁 Auth initialization completed');
        }
      }
    };

    initializeAuth();

    // DISABLED: Periodic session check was causing login interference
    const sessionCheckInterval = null; // Check every 10 seconds (even less frequent)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth state changed:', event, session ? 'with session' : 'no session');

      if (event === 'SIGNED_IN' && session) {
        console.log('🔐 NUCLEAR OPTION: IMMEDIATE SIGNED_IN PROCESSING');

        // IMMEDIATE STATE UPDATE - NO WAITING, NO LOADING
        setSession(session);
        setIsLoading(false);
        setIsInitialized(true);

        // Clear ALL timeouts
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        // Fetch profile in background - DON'T BLOCK UI
        fetchProfile(session.user.id).then(profileData => {
          if (mounted) {
            setProfile(profileData);
          }
        });

        fetchMemberships(session.user.id).then(memberships => {
          if (mounted) {
            setUserMemberships(memberships || []);
          }
        });

        console.log('✅ IMMEDIATE AUTH STATE SET - UI SHOULD UPDATE NOW');
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Processing SIGNED_OUT event');
        setSession(null);
        setProfile(null);
        setUserMemberships([]);
        setError(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      // clearInterval(sessionCheckInterval); // DISABLED
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    profile,
    userMemberships,
    authenticatedUser,
    isLoading,
    isInitialized,
    error,
    signOut,
    refreshProfile,
    refreshMemberships,
    refreshSession,
    clearError,
    forceLogout,
    resetAuthState,
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

export default AuthContext;