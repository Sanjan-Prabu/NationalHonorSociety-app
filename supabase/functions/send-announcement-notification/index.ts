import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    console.log('🔔 Announcement notification function triggered');
    
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload = await req.json();
    console.log('📝 Payload:', payload);
    
    // Only process INSERT events for active announcements
    if (payload.type !== 'INSERT' || payload.record.status !== 'active') {
      console.log('⏭️ Skipping non-insert or inactive announcement');
      return new Response('OK', { status: 200 });
    }
    
    const announcement = payload.record;
    console.log('📢 Processing announcement:', announcement.title);
    
    // Get organization members with push tokens using Supabase client
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, email, expo_push_token')
      .eq('org_id', announcement.org_id)
      .eq('notifications_enabled', true)
      .not('expo_push_token', 'is', null);
    
    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`);
    }
    
    console.log(`👥 Found ${members?.length || 0} members with push tokens`);
    
    if (!members || members.length === 0) {
      console.log('ℹ️ No members to notify');
      return new Response(JSON.stringify({
        success: true,
        message: 'No members to notify',
        total: 0,
        successful: 0,
        failed: 0
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Send notifications to each member
    let successful = 0;
    let failed = 0;
    
    for (const member of members) {
      try {
        console.log(`📱 Sending to ${member.email}...`);
        
        const notificationPayload = {
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
        };
        
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notificationPayload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
        
        if (ticket && ticket.status === 'ok') {
          successful++;
          console.log(`✅ Notification sent to ${member.email}`);
        } else {
          failed++;
          console.log(`❌ Notification failed for ${member.email}:`, ticket);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error sending to ${member.email}:`, error);
      }
    }
    
    console.log(`🎉 Notification sending complete! Successful: ${successful}, Failed: ${failed}`);
    
    return new Response(JSON.stringify({
      success: true,
      total: members.length,
      successful,
      failed
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
