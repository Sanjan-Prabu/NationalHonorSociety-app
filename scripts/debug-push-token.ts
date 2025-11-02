/**
 * Debug script to check push token registration
 * Run this to verify your device is properly registered for notifications
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client for Node.js environment
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!
);

export async function debugPushToken(userId?: string, pushToken?: string) {
  console.log('🔍 Debugging Push Token Registration...\n');

  try {
    // 1. Check if push token is provided
    if (pushToken) {
      console.log('1. Checking Provided Push Token...');
      console.log('✅ Push Token:', pushToken);
      
      // Validate token format
      if (pushToken.startsWith('ExponentPushToken[') && pushToken.endsWith(']')) {
        console.log('✅ Token format is valid');
      } else {
        console.log('❌ Invalid token format. Should be: ExponentPushToken[...]');
      }
    } else {
      console.log('1. No push token provided - will check database only');
    }
    
    // 2. Check database registration
    console.log('\n2. Checking Database Registration...');
    if (userId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, expo_push_token, notifications_enabled, notification_preferences')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.log('❌ Database Error:', error.message);
      } else {
        console.log('👤 User ID:', profile.id);
        console.log('📱 Stored Token:', profile.expo_push_token || 'Not set');
        console.log('🔔 Notifications Enabled:', profile.notifications_enabled);
        console.log('⚙️  Notification Preferences:', JSON.stringify(profile.notification_preferences, null, 2));
        
        // Check if tokens match (if both provided)
        if (pushToken && profile.expo_push_token) {
          if (profile.expo_push_token === pushToken) {
            console.log('✅ Token matches database!');
          } else {
            console.log('⚠️  Token mismatch! Database has different token.');
          }
        } else if (!profile.expo_push_token) {
          console.log('❌ No push token stored in database!');
        }
      }
    } else {
      console.log('ℹ️  No user ID provided - skipping database check');
    }
    
    // 3. Test token validity with Expo (if token provided)
    if (pushToken) {
      console.log('\n3. Testing Token with Expo Service...');
      const testResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: '🧪 Debug Test Notification',
          body: 'This is a test from the debug script - if you see this, your token works!',
          sound: 'default',
          data: { 
            test: true,
            type: 'debug',
            itemId: 'debug-test',
            orgId: 'debug-org'
          }
        }),
      });
      
      const testResult = await testResponse.json();
      console.log('📤 Test Send Result:', JSON.stringify(testResult, null, 2));
      
      if (testResult.data && testResult.data[0]) {
        const ticket = testResult.data[0];
        if (ticket.status === 'ok') {
          console.log('✅ Test notification sent successfully!');
          console.log('🎫 Ticket ID:', ticket.id);
          console.log('⏰ Check your device - you should receive the notification within 30 seconds');
        } else {
          console.log('❌ Test notification failed:', ticket.message);
          if (ticket.details) {
            console.log('🔍 Error Details:', ticket.details);
          }
        }
      }
    } else {
      console.log('\n3. Skipping Expo test - no push token provided');
    }
    
    // 4. Check organization membership (if userId provided)
    if (userId) {
      console.log('\n4. Checking Organization Membership...');
      const { data: memberships, error: memberError } = await supabase
        .from('memberships')
        .select(`
          org_id,
          is_active,
          role,
          organizations (name)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (memberError) {
        console.log('❌ Membership Error:', memberError.message);
      } else {
        console.log('🏢 Active Memberships:', memberships?.length || 0);
        if (memberships && memberships.length > 0) {
          memberships.forEach(membership => {
            console.log(`  - ${membership.organizations?.name} (${membership.org_id})`);
            console.log(`    Role: ${membership.role}`);
          });
        } else {
          console.log('❌ No active organization memberships found!');
          console.log('   This could be why you\'re not receiving notifications.');
        }
      }
      
      // 5. Check recent announcements in user's organizations
      if (memberships && memberships.length > 0) {
        console.log('\n5. Checking Recent Announcements...');
        const orgIds = memberships.map(m => m.org_id);
        
        const { data: announcements, error: announcementError } = await supabase
          .from('announcements')
          .select('id, title, created_at, org_id')
          .in('org_id', orgIds)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (announcementError) {
          console.log('❌ Announcement Error:', announcementError.message);
        } else {
          console.log('📢 Recent Announcements:', announcements?.length || 0);
          if (announcements && announcements.length > 0) {
            announcements.forEach(announcement => {
              console.log(`  - ${announcement.title}`);
              console.log(`    Created: ${new Date(announcement.created_at).toLocaleString()}`);
              console.log(`    Org ID: ${announcement.org_id}`);
            });
          } else {
            console.log('ℹ️  No recent announcements found in your organizations');
          }
        }
      }
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('================');
    if (pushToken) {
      console.log(`Push Token: ${pushToken}`);
    }
    if (userId) {
      console.log(`User ID: ${userId}`);
    }
    console.log(`Project ID: 7f08ade8-6a47-4450-9816-dc38a89bd6a2`);
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  }
}

// If running directly
if (require.main === module) {
  const userId = process.argv[2];
  const pushToken = process.argv[3];
  
  if (!userId && !pushToken) {
    console.log('Usage:');
    console.log('  npx tsx scripts/debug-push-token.ts "user-id"');
    console.log('  npx tsx scripts/debug-push-token.ts "user-id" "ExponentPushToken[...]"');
    console.log('  npx tsx scripts/debug-push-token.ts "" "ExponentPushToken[...]"  # Just test token');
    process.exit(1);
  }
  
  debugPushToken(userId || undefined, pushToken || undefined);
}