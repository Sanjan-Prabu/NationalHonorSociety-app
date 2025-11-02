/**
 * Find user by email to get their user ID
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!
);

async function findUser(email: string) {
  console.log('🔍 Looking for user with email:', email);
  
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, expo_push_token, notifications_enabled')
      .ilike('email', `%${email}%`);
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found with that email');
      return;
    }
    
    console.log(`\n✅ Found ${users.length} user(s):`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Not set');
      console.log(`   Push Token: ${user.expo_push_token ? 'Set' : 'Not set'}`);
      console.log(`   Notifications: ${user.notifications_enabled ? 'Enabled' : 'Disabled'}`);
      
      if (user.expo_push_token) {
        console.log(`   Token: ${user.expo_push_token}`);
      }
    });
    
    if (users.length === 1) {
      const user = users[0];
      console.log('\n🎯 Quick Commands:');
      console.log(`Debug: npx tsx scripts/debug-push-token.ts "${user.id}"`);
      if (user.expo_push_token) {
        console.log(`Test: npx tsx scripts/send-test-notification.ts "${user.expo_push_token}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error finding user:', error);
  }
}

// Usage: npx tsx scripts/find-user.ts "your-email@example.com"
if (require.main === module) {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: npx tsx scripts/find-user.ts "your-email@example.com"');
    process.exit(1);
  }
  findUser(email);
}