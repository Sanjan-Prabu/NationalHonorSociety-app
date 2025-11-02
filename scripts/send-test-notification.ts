/**
 * Send a test notification directly to a specific push token
 * Use this to test if your device can receive notifications
 */

async function sendTestNotification(pushToken: string) {
  console.log('📤 Sending test notification to:', pushToken);
  
  // Validate token format
  if (!pushToken.startsWith('ExponentPushToken[') || !pushToken.endsWith(']')) {
    console.log('❌ Invalid token format. Expected: ExponentPushToken[...]');
    return;
  }
  
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: '🧪 Direct Test Notification',
        body: 'If you see this, your push token is working! This bypasses your app\'s notification logic.',
        sound: 'default',
        data: {
          type: 'test',
          itemId: 'direct-test-123',
          orgId: 'test-org',
          priority: 'normal'
        },
        channelId: 'default',
        priority: 'normal'
      }),
    });

    const result = await response.json();
    console.log('📋 Full Response:', JSON.stringify(result, null, 2));

    // Handle both array and single object response formats
    const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
    
    if (ticket && ticket.status === 'ok') {
      console.log('\n✅ Notification sent successfully!');
      console.log('🎫 Ticket ID:', ticket.id);
      console.log('⏰ You should receive the notification within 30 seconds');
      console.log('📱 Check your iPhone for the notification!');
    } else if (ticket && ticket.status === 'error') {
      console.log('\n❌ Notification failed!');
      console.log('📝 Status:', ticket.status);
      console.log('💬 Message:', ticket.message);
      if (ticket.details) {
        console.log('🔍 Details:', JSON.stringify(ticket.details, null, 2));
      }
    } else {
      console.log('❌ Unexpected response format:', result);
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

// Usage: npx tsx scripts/send-test-notification.ts "ExponentPushToken[your-token-here]"
if (require.main === module) {
  const token = process.argv[2];
  if (!token) {
    console.log('Usage: npx tsx scripts/send-test-notification.ts "ExponentPushToken[your-token]"');
    process.exit(1);
  }
  sendTestNotification(token);
}