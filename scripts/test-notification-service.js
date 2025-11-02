#!/usr/bin/env node

/**
 * Test the notification service directly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function testNotificationService() {
  console.log('🧪 Testing notification service directly...\n');

  try {
    // Get organization members with push tokens
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, notifications_enabled, notification_preferences, org_id')
      .not('expo_push_token', 'is', null)
      .eq('notifications_enabled', true);

    if (profilesError) {
      console.error('❌ Failed to get profiles:', profilesError.message);
      return;
    }

    console.log('✅ Found', profiles?.length || 0, 'users with push tokens');

    if (!profiles || profiles.length === 0) {
      console.log('❌ No users with push tokens found');
      return;
    }

    // Get the first user's push token for testing
    const testUser = profiles[0];
    console.log('🎯 Testing with user:', testUser.id);
    console.log('📱 Push token:', testUser.expo_push_token.substring(0, 20) + '...');

    // Test sending a notification directly to Expo
    const testPayload = {
      to: testUser.expo_push_token,
      title: 'Test Notification',
      body: 'This is a test notification from the debug script',
      data: {
        type: 'announcement',
        itemId: 'test-123',
        orgId: testUser.org_id,
        priority: 'normal'
      },
      sound: 'default',
      priority: 'normal'
    };

    console.log('\n📤 Sending test notification to Expo...');
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, response.statusText);
      console.error('❌ Error body:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Expo response:', JSON.stringify(result, null, 2));

    // Check if there were any errors in the response
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          console.error(`❌ Ticket ${index} error:`, ticket.message, ticket.details);
        } else {
          console.log(`✅ Ticket ${index} success:`, ticket.id);
        }
      });
    }

    console.log('\n🎉 Test complete! Check your device for the notification.');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testNotificationService().catch(console.error);