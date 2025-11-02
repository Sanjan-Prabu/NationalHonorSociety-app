/**
 * Check if user is properly set up for notifications
 */

import { supabase } from '../src/lib/supabaseClient';

async function checkUserSetup(userId: string) {
  console.log('👤 Checking user setup for:', userId);
  
  try {
    // 1. Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log('❌ Profile Error:', profileError.message);
      return;
    }
    
    console.log('\n📋 User Profile:');
    console.log('- ID:', profile.id);
    console.log('- Email:', profile.email);
    console.log('- Name:', profile.full_name);
    console.log('- Push Token:', profile.expo_push_token ? 'Set' : 'Missing');
    console.log('- Notifications Enabled:', profile.notifications_enabled);
    console.log('- Notification Preferences:', JSON.stringify(profile.notification_preferences, null, 2));
    
    // 2. Check memberships
    const { data: memberships, error: memberError } = await supabase
      .from('memberships')
      .select(`
        *,
        organizations (*)
      `)
      .eq('user_id', userId);
    
    if (memberError) {
      console.log('❌ Membership Error:', memberError.message);
    } else {
      console.log('\n🏢 Organization Memberships:');
      if (memberships && memberships.length > 0) {
        memberships.forEach(membership => {
          console.log(`- ${membership.organizations?.name} (${membership.org_id})`);
          console.log(`  Role: ${membership.role}`);
          console.log(`  Active: ${membership.is_active}`);
        });
      } else {
        console.log('❌ No organization memberships found!');
      }
    }
    
    // 3. Check recent announcements in user's organizations
    if (memberships && memberships.length > 0) {
      const orgIds = memberships.map(m => m.org_id);
      
      const { data: announcements, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .in('org_id', orgIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (announcementError) {
        console.log('❌ Announcement Error:', announcementError.message);
      } else {
        console.log('\n📢 Recent Announcements:');
        if (announcements && announcements.length > 0) {
          announcements.forEach(announcement => {
            console.log(`- ${announcement.title} (${new Date(announcement.created_at).toLocaleString()})`);
          });
        } else {
          console.log('ℹ️  No recent announcements found');
        }
      }
    }
    
    // 4. Check notification history
    const { data: notificationHistory, error: historyError } = await supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(5);
    
    if (historyError) {
      console.log('❌ History Error:', historyError.message);
    } else {
      console.log('\n📜 Recent Notification History:');
      if (notificationHistory && notificationHistory.length > 0) {
        notificationHistory.forEach(notification => {
          console.log(`- ${notification.notification_type}: ${notification.title}`);
          console.log(`  Sent: ${new Date(notification.sent_at).toLocaleString()}`);
          console.log(`  Status: ${notification.delivery_status}`);
        });
      } else {
        console.log('ℹ️  No notification history found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking user setup:', error);
  }
}

// Usage: npx tsx scripts/check-user-setup.ts "user-id-here"
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: npx tsx scripts/check-user-setup.ts "user-id"');
    process.exit(1);
  }
  checkUserSetup(userId);
}