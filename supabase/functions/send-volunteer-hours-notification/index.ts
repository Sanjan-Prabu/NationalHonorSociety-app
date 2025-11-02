import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    console.log('🔔 Volunteer hours notification function triggered');
    
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload = await req.json();
    console.log('📝 Payload:', payload);
    
    // Only process INSERT events for volunteer hours
    if (payload.type !== 'INSERT') {
      console.log('⏭️ Skipping non-insert event');
      return new Response('OK', { status: 200 });
    }
    
    const volunteerHour = payload.record;
    console.log('📋 Processing volunteer hour submission:', volunteerHour.id);
    
    // Get member name
    const { data: memberProfile, error: memberError } = await supabase
      .from('profiles')
      .select('first_name, last_name, display_name')
      .eq('id', volunteerHour.member_id)
      .single();
    
    if (memberError) {
      console.error('❌ Failed to fetch member profile:', memberError);
    }
    
    const memberName = memberProfile?.display_name || 
                       `${memberProfile?.first_name || ''} ${memberProfile?.last_name || ''}`.trim() || 
                       'A member';
    
    // Get organization officers with push tokens
    const { data: officers, error: officersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        expo_push_token,
        notifications_enabled,
        notification_preferences,
        muted_until,
        memberships!inner(role, org_id, is_active)
      `)
      .eq('memberships.org_id', volunteerHour.org_id)
      .eq('memberships.is_active', true)
      .in('memberships.role', ['officer', 'president', 'vice_president', 'admin'])
      .eq('notifications_enabled', true)
      .not('expo_push_token', 'is', null);
    
    if (officersError) {
      throw new Error(`Failed to fetch officers: ${officersError.message}`);
    }
    
    console.log(`👥 Found ${officers?.length || 0} officers with push tokens`);
    
    if (!officers || officers.length === 0) {
      console.log('ℹ️ No officers to notify');
      return new Response(JSON.stringify({
        success: true,
        message: 'No officers to notify',
        total: 0,
        successful: 0,
        failed: 0
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Filter officers based on preferences and mute status
    const now = new Date();
    const eligibleOfficers = officers.filter(officer => {
      // Check if temporarily muted
      if (officer.muted_until && new Date(officer.muted_until) > now) {
        return false;
      }
      
      // Check notification preferences
      const preferences = officer.notification_preferences || {};
      if (preferences.volunteer_hours === false) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ ${eligibleOfficers.length} eligible officers after filtering`);
    
    if (eligibleOfficers.length === 0) {
      console.log('ℹ️ No eligible officers after filtering');
      return new Response(JSON.stringify({
        success: true,
        message: 'No eligible officers after filtering',
        total: 0,
        successful: 0,
        failed: 0
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Send notifications to each eligible officer
    let successful = 0;
    let failed = 0;
    
    for (const officer of eligibleOfficers) {
      try {
        console.log(`📱 Sending to ${officer.email}...`);
        
        const notificationPayload = {
          to: officer.expo_push_token,
          title: 'New Volunteer Hours Request',
          body: `${memberName} submitted ${volunteerHour.hours} volunteer hours for review`,
          sound: 'default',
          data: {
            type: 'volunteer_hours',
            itemId: volunteerHour.id,
            orgId: volunteerHour.org_id,
            priority: 'normal',
            action: 'review_required'
          },
          channelId: 'volunteer_hours',
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
          console.log(`✅ Notification sent to ${officer.email}`);
        } else {
          failed++;
          console.log(`❌ Notification failed for ${officer.email}:`, ticket);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error sending to ${officer.email}:`, error);
      }
    }
    
    console.log(`🎉 Notification sending complete! Successful: ${successful}, Failed: ${failed}`);
    
    return new Response(JSON.stringify({
      success: true,
      total: eligibleOfficers.length,
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
