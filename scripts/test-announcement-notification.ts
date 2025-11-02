/**
 * Test script to manually trigger announcement notification
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!
);

async function testAnnouncementNotification() {
  console.log('🧪 Testing announcement notification manually...');
  
  try {
    // Get the latest announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.log('❌ Error fetching announcement:', error.message);
      return;
    }
    
    console.log('📢 Latest announcement:', {
      id: announcement.id,
      title: announcement.title,
      created_by: announcement.created_by,
      org_id: announcement.org_id,
      created_at: announcement.created_at
    });
    
    // Get organization members with push tokens (using profiles.org_id directly)
    const { data: members, error: memberError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        expo_push_token,
        notifications_enabled
      `)
      .eq('org_id', announcement.org_id)
      .eq('notifications_enabled', true)
      .not('expo_push_token', 'is', null);
    
    if (memberError) {
      console.log('❌ Error fetching members:', memberError.message);
      return;
    }
    
    console.log('👥 Members with push tokens:', members?.length || 0);
    members?.forEach(member => {
      console.log(`  - ${member.email}: ${member.expo_push_token ? 'Has token' : 'No token'}`);
    });
    
    if (!members || members.length === 0) {
      console.log('❌ No members with push tokens found!');
      return;
    }
    
    // Send notifications manually
    console.log('\n📤 Sending notifications manually...');
    
    for (const member of members) {
      if (!member.expo_push_token) continue;
      
      console.log(`📱 Sending to ${member.email}...`);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: member.expo_push_token,
          title: `New Announcement: ${announcement.title}`,
          body: announcement.message || 'Tap to view details',
          sound: 'default',
          data: {
            type: 'announcement',
            itemId: announcement.id,
            orgId: announcement.org_id,
            priority: 'normal'
          },
          channelId: 'announcements',
          priority: 'normal'
        }),
      });
      
      const result = await response.json();
      console.log(`📋 Result for ${member.email}:`, result);
      
      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      if (ticket && ticket.status === 'ok') {
        console.log(`✅ Notification sent successfully to ${member.email}`);
      } else {
        console.log(`❌ Notification failed for ${member.email}:`, ticket);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
if (require.main === module) {
  testAnnouncementNotification();
}