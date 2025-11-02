#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function testDirectPushToken() {
  console.log('🧪 Testing push token directly...\n');

  try {
    // Get your specific push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, expo_push_token')
      .eq('email', 'home@gmail.com')
      .single();

    if (error || !profile) {
      console.error('❌ Failed to get your profile:', error?.message);
      return;
    }

    console.log('📱 Your push token:', profile.expo_push_token);

    // Test 1: Simple notification
    console.log('\n🧪 Test 1: Simple notification...');
    const response1 = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: 'Direct Test 1',
        body: 'This is a direct push token test',
        sound: 'default'
      }),
    });

    const result1 = await response1.json();
    console.log('Result 1:', result1);

    // Test 2: With data payload
    console.log('\n🧪 Test 2: With data payload...');
    const response2 = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: 'Direct Test 2',
        body: 'This test includes data payload',
        sound: 'default',
        data: {
          type: 'test',
          itemId: 'direct-test-123'
        }
      }),
    });

    const result2 = await response2.json();
    console.log('Result 2:', result2);

    // Test 3: Check if token is valid format
    console.log('\n🧪 Test 3: Token validation...');
    if (profile.expo_push_token.startsWith('ExponentPushToken[')) {
      console.log('✅ Token format looks correct');
    } else {
      console.log('❌ Token format looks incorrect');
    }

    console.log('\n💡 If you received notifications, the token works!');
    console.log('💡 If not, there might be a device/app issue.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDirectPushToken().catch(console.error);