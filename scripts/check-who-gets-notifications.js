#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function checkWhoGetsNotifications() {
  console.log('🔍 Checking who gets notifications...\n');

  try {
    // Get all users with push tokens
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, expo_push_token, notifications_enabled, notification_preferences, org_id, role')
      .not('expo_push_token', 'is', null)
      .eq('notifications_enabled', true);

    if (profilesError) {
      console.error('❌ Failed to get profiles:', profilesError.message);
      return;
    }

    console.log('📱 All users with push tokens:');
    profiles?.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email}`);
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Org: ${profile.org_id}`);
      console.log(`   - Role: ${profile.role || 'member'}`);
      console.log(`   - Push token: ${profile.expo_push_token.substring(0, 30)}...`);
      console.log(`   - Notifications enabled: ${profile.notifications_enabled}`);
      console.log(`   - Announcement notifications: ${profile.notification_preferences?.announcements !== false ? 'YES' : 'NO'}`);
      console.log('');
    });

    // Check current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user) {
      console.log('🔐 Current authenticated user:', user.email);
      console.log('   - ID:', user.id);
      
      const currentUserProfile = profiles?.find(p => p.id === user.id);
      if (currentUserProfile) {
        console.log('   - ✅ Current user HAS push token and notifications enabled');
      } else {
        console.log('   - ❌ Current user does NOT have push token or notifications disabled');
      }
    } else {
      console.log('❌ No authenticated user found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWhoGetsNotifications().catch(console.error);