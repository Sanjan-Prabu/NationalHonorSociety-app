#!/usr/bin/env tsx

/**
 * Debug script to test announcement notification flow
 * This will help identify why notifications aren't being sent when creating announcements
 */

import { supabase } from '../src/lib/supabaseClient';
import { notificationService } from '../src/services/NotificationService';
import { announcementService } from '../src/services/AnnouncementService';

async function debugAnnouncementNotification() {
  console.log('🔍 Debugging announcement notification flow...\n');

  try {
    // 1. Check if we can get current user and organization
    console.log('1. Checking authentication and organization...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return;
    }
    
    console.log('✅ User authenticated:', user.email);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id, role, organizations(slug)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      console.error('❌ Failed to get organization membership:', membershipError?.message);
      return;
    }

    console.log('✅ Organization:', (membership.organizations as any)?.slug);
    console.log('✅ Role:', membership.role);

    // 2. Check if user has push token and notifications enabled
    console.log('\n2. Checking notification setup...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token, notifications_enabled, notification_preferences')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Failed to get profile:', profileError.message);
      return;
    }

    console.log('✅ Push token exists:', !!profile?.expo_push_token);
    console.log('✅ Notifications enabled:', profile?.notifications_enabled);
    console.log('✅ Announcement notifications:', profile?.notification_preferences?.announcements !== false);

    // 3. Check how many organization members have notifications enabled
    console.log('\n3. Checking organization notification recipients...');
    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, notifications_enabled, notification_preferences')
      .eq('org_id', membership.org_id)
      .eq('notifications_enabled', true)
      .not('expo_push_token', 'is', null);

    if (recipientsError) {
      console.error('❌ Failed to get recipients:', recipientsError.message);
      return;
    }

    const validRecipients = recipients?.filter(r => 
      r.notification_preferences?.announcements !== false
    ) || [];

    console.log('✅ Total org members with push tokens:', recipients?.length || 0);
    console.log('✅ Members with announcement notifications enabled:', validRecipients.length);

    // 4. Test creating an announcement (but don't actually create it)
    console.log('\n4. Testing announcement creation flow...');
    
    const testAnnouncement = {
      title: 'Test Notification Debug',
      message: 'This is a test announcement to debug notifications',
      tag: 'Reminder'
    };

    console.log('📝 Test announcement data:', testAnnouncement);

    // 5. Test the notification service directly
    console.log('\n5. Testing notification service directly...');
    
    // Create a mock announcement object for testing
    const mockAnnouncement = {
      id: 'test-id',
      org_id: membership.org_id,
      created_by: user.id,
      title: testAnnouncement.title,
      message: testAnnouncement.message,
      tag: testAnnouncement.tag,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const notificationResult = await notificationService.sendAnnouncementNotification(mockAnnouncement);
      
      console.log('📤 Notification service result:');
      console.log('  Success:', notificationResult.success);
      console.log('  Error:', notificationResult.error);
      
      if (notificationResult.data) {
        console.log('  Total sent:', notificationResult.data.totalSent);
        console.log('  Successful:', notificationResult.data.successful);
        console.log('  Failed:', notificationResult.data.failed);
        console.log('  Errors:', notificationResult.data.errors);
      }
    } catch (notificationError) {
      console.error('❌ Notification service error:', notificationError);
    }

    // 6. Check recent announcements to see if any were created
    console.log('\n6. Checking recent announcements...');
    const { data: recentAnnouncements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, created_at, created_by')
      .eq('org_id', membership.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (announcementsError) {
      console.error('❌ Failed to get recent announcements:', announcementsError.message);
    } else {
      console.log('✅ Recent announcements:');
      recentAnnouncements?.forEach((ann, index) => {
        console.log(`  ${index + 1}. ${ann.title} (${new Date(ann.created_at).toLocaleString()})`);
      });
    }

    console.log('\n✅ Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('1. If notification service test failed, check the error details above');
    console.log('2. If no recipients found, check user notification preferences');
    console.log('3. If everything looks good, try creating a real announcement and check logs');

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugAnnouncementNotification().catch(console.error);