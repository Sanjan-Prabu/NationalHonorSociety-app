#!/usr/bin/env node

/**
 * Simple debug script to check announcement notification flow
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function debugAnnouncementNotification() {
  console.log('🔍 Debugging announcement notification flow...\n');

  try {
    // Check environment variables
    console.log('1. Checking environment...');
    console.log('✅ Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
    console.log('✅ Supabase Key:', process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Set' : 'Missing');

    // Check recent announcements
    console.log('\n2. Checking recent announcements...');
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, created_at, org_id, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (announcementsError) {
      console.error('❌ Failed to get announcements:', announcementsError.message);
      return;
    }

    console.log('✅ Recent announcements:');
    announcements?.forEach((ann, index) => {
      console.log(`  ${index + 1}. ${ann.title} (${new Date(ann.created_at).toLocaleString()})`);
    });

    // Check organization members with push tokens
    console.log('\n3. Checking organization members with push tokens...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, notifications_enabled, notification_preferences, org_id')
      .not('expo_push_token', 'is', null)
      .eq('notifications_enabled', true);

    if (profilesError) {
      console.error('❌ Failed to get profiles:', profilesError.message);
      return;
    }

    console.log('✅ Total users with push tokens:', profiles?.length || 0);
    
    // Group by organization
    const orgGroups = {};
    profiles?.forEach(profile => {
      if (!orgGroups[profile.org_id]) {
        orgGroups[profile.org_id] = [];
      }
      orgGroups[profile.org_id].push(profile);
    });

    console.log('✅ Users by organization:');
    Object.entries(orgGroups).forEach(([orgId, users]) => {
      const announcementEnabled = users.filter(u => 
        u.notification_preferences?.announcements !== false
      ).length;
      console.log(`  Org ${orgId}: ${users.length} users, ${announcementEnabled} with announcement notifications`);
    });

    // Check if there are any notification logs or errors
    console.log('\n4. Checking for any notification-related data...');
    
    // Check if there are any notification rate limiting records
    const { data: rateLimits, error: rateLimitError } = await supabase
      .from('notification_rate_limits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (rateLimitError) {
      console.log('ℹ️  No rate limit table found (this is normal)');
    } else {
      console.log('✅ Recent rate limit records:', rateLimits?.length || 0);
    }

    console.log('\n✅ Debug complete!');
    console.log('\n💡 To test notifications:');
    console.log('1. Create an announcement in the app');
    console.log('2. Check the app logs for notification service calls');
    console.log('3. Verify your device has a valid push token');

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugAnnouncementNotification().catch(console.error);