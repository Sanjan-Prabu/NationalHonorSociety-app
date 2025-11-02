/**
 * Check Expo push notification receipts to see if notifications were actually delivered
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!
);

async function checkPushReceipts() {
  console.log('🔍 Checking push notification delivery status...\n');
  
  try {
    // Get users with push tokens
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, expo_push_token, notifications_enabled')
      .not('expo_push_token', 'is', null);
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }
    
    console.log(`📱 Found ${users?.length || 0} users with push tokens:\n`);
    
    users?.forEach(user => {
      console.log(`  ${user.email}:`);
      console.log(`    Token: ${user.expo_push_token?.substring(0, 30)}...`);
      console.log(`    Notifications: ${user.notifications_enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log('');
    });
    
    // Test sending a notification RIGHT NOW
    console.log('\n🧪 Sending TEST notification to all users...\n');
    
    for (const user of users || []) {
      if (!user.expo_push_token) continue;
      
      console.log(`📤 Sending to ${user.email}...`);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.expo_push_token,
          title: '🧪 TEST NOTIFICATION',
          body: 'If you see this, push notifications are working!',
          sound: 'default',
          priority: 'high',
          channelId: 'announcements',
        }),
      });
      
      const result = await response.json();
      console.log(`   Response:`, result);
      
      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      
      if (ticket?.status === 'ok') {
        console.log(`   ✅ Ticket ID: ${ticket.id}`);
        console.log(`   📱 CHECK YOUR DEVICE NOW!\n`);
      } else if (ticket?.status === 'error') {
        console.log(`   ❌ ERROR: ${ticket.message}`);
        console.log(`   Details:`, ticket.details);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPushReceipts();
