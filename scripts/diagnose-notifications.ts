#!/usr/bin/env tsx
/**
 * Diagnostic script to check notification setup
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!
);

async function diagnose() {
  console.log('🔍 NOTIFICATION DIAGNOSTIC TOOL\n');

  // 1. Check users with push tokens
  console.log('1️⃣ Checking users with push tokens...');
  const { data: usersWithTokens, error: tokenError } = await supabase
    .from('profiles')
    .select('id, email, expo_push_token, notifications_enabled, org_id')
    .not('expo_push_token', 'is', null);

  if (tokenError) {
    console.error('❌ Error:', tokenError.message);
  } else {
    console.log(`✅ Found ${usersWithTokens?.length || 0} users with push tokens`);
    usersWithTokens?.forEach(user => {
      console.log(`   - ${user.email}: ${user.notifications_enabled ? '✅ Enabled' : '❌ Disabled'}`);
    });
  }

  // 2. Check recent announcements
  console.log('\n2️⃣ Checking recent announcements...');
  const { data: announcements, error: announcementError } = await supabase
    .from('announcements')
    .select('id, title, created_at, org_id, status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (announcementError) {
    console.error('❌ Error:', announcementError.message);
  } else {
    console.log(`✅ Found ${announcements?.length || 0} recent announcements`);
    announcements?.forEach(ann => {
      console.log(`   - ${ann.title} (${ann.status}) - ${new Date(ann.created_at).toLocaleString()}`);
    });
  }

  // 3. Test Edge Function connectivity
  console.log('\n3️⃣ Testing Edge Function connectivity...');
  try {
    const response = await fetch('https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY}`
      },
      body: JSON.stringify({
        type: 'TEST',
        table: 'announcements',
        record: { id: 'test', org_id: 'test', title: 'Test', status: 'active' }
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // 4. Check environment variables
  console.log('\n4️⃣ Checking environment variables...');
  console.log(`   EXPO_PUBLIC_SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   EXPO_PUBLIC_SUPABASE_KEY: ${process.env.EXPO_PUBLIC_SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);

  console.log('\n✅ Diagnostic complete!\n');
}

diagnose().catch(console.error);
