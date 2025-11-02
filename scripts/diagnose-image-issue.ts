#!/usr/bin/env npx tsx

/**
 * PRECISE IMAGE ISSUE DIAGNOSIS
 * This script will test every possible failure point
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUrl(url: string, description: string): Promise<boolean> {
  try {
    console.log(`\n🔍 Testing ${description}:`);
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'NHS-App-Diagnostic/1.0',
        'Cache-Control': 'no-cache'
      }
    });
    const endTime = Date.now();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response Time: ${endTime - startTime}ms`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')}`);
    console.log(`Cache-Control: ${response.headers.get('cache-control')}`);
    console.log(`ETag: ${response.headers.get('etag')}`);
    
    if (response.ok) {
      console.log('✅ URL is accessible');
      return true;
    } else {
      console.log('❌ URL returned error');
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function diagnoseImageIssue(): Promise<void> {
  console.log('🚨 PRECISE IMAGE ISSUE DIAGNOSIS');
  console.log('='.repeat(50));

  // Test 1: Check database for image URLs
  console.log('\n📊 TEST 1: Database Image URLs');
  console.log('-'.repeat(30));
  
  try {
    const { data: announcements, error: announcementError } = await supabase
      .from('announcements')
      .select('id, title, image_url, created_at')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (announcementError) {
      console.log('❌ Error fetching announcements:', announcementError);
    } else {
      console.log(`Found ${announcements?.length || 0} announcements with images`);
      announcements?.forEach((ann, index) => {
        console.log(`${index + 1}. ${ann.title}: ${ann.image_url}`);
      });
    }

    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('id, title, image_url, created_at')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (eventError) {
      console.log('❌ Error fetching events:', eventError);
    } else {
      console.log(`Found ${events?.length || 0} events with images`);
      events?.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title}: ${event.image_url}`);
      });
    }
  } catch (error) {
    console.log('❌ Database connection failed:', error);
  }

  // Test 2: Test specific URLs
  console.log('\n🌐 TEST 2: URL Accessibility');
  console.log('-'.repeat(30));

  const testUrls = [
    {
      url: 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg',
      description: 'Your provided R2 URL'
    },
    {
      url: 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/announcements/550e8400-e29b-41d4-a716-446655440003/1761705387911-81qlmc.jpg',
      description: 'Database announcement URL'
    },
    {
      url: 'https://picsum.photos/200/200',
      description: 'External test image'
    },
    {
      url: 'https://httpbin.org/image/jpeg',
      description: 'Another external test image'
    }
  ];

  const results = [];
  for (const test of testUrls) {
    const success = await testUrl(test.url, test.description);
    results.push({ ...test, success });
  }

  // Test 3: Check R2 domain specifically
  console.log('\n🔧 TEST 3: R2 Domain Analysis');
  console.log('-'.repeat(30));

  try {
    const r2Domain = 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev';
    const response = await fetch(r2Domain, { method: 'HEAD' });
    console.log(`R2 Domain Status: ${response.status} ${response.statusText}`);
    console.log(`R2 Server: ${response.headers.get('server')}`);
    console.log(`R2 CF-Ray: ${response.headers.get('cf-ray')}`);
  } catch (error) {
    console.log('❌ R2 domain test failed:', error);
  }

  // Test 4: Check for CORS issues
  console.log('\n🔒 TEST 4: CORS and Security Headers');
  console.log('-'.repeat(30));

  try {
    const testUrl = 'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/proof-images/550e8400-e29b-41d4-a716-446655440003/1761710788808-g1itlq.jpg';
    const response = await fetch(testUrl, { 
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8081', // Typical Expo dev server
        'Accept': 'image/*'
      }
    });
    
    console.log(`CORS Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`CORS Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
    console.log(`Content-Security-Policy: ${response.headers.get('content-security-policy')}`);
    console.log(`X-Frame-Options: ${response.headers.get('x-frame-options')}`);
    
  } catch (error) {
    console.log('❌ CORS test failed:', error);
  }

  // Summary
  console.log('\n📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(50));

  const workingUrls = results.filter(r => r.success).length;
  const totalUrls = results.length;

  console.log(`✅ Working URLs: ${workingUrls}/${totalUrls}`);
  console.log(`❌ Failed URLs: ${totalUrls - workingUrls}/${totalUrls}`);

  if (workingUrls === 0) {
    console.log('\n🚨 CRITICAL: NO URLs are accessible');
    console.log('This indicates a network connectivity issue');
  } else if (workingUrls < totalUrls) {
    console.log('\n⚠️  WARNING: Some URLs are not accessible');
    console.log('This indicates specific domain or URL issues');
  } else {
    console.log('\n✅ SUCCESS: All URLs are accessible');
    console.log('The issue is likely in React Native image rendering');
  }

  console.log('\n🎯 NEXT STEPS:');
  if (workingUrls === 0) {
    console.log('1. Check internet connection');
    console.log('2. Check firewall/proxy settings');
    console.log('3. Try different network (mobile data vs WiFi)');
  } else if (workingUrls < totalUrls) {
    console.log('1. Check specific failing URLs');
    console.log('2. Verify R2 bucket configuration');
    console.log('3. Check domain DNS resolution');
  } else {
    console.log('1. Check React Native Image component');
    console.log('2. Check app network permissions');
    console.log('3. Check iOS App Transport Security');
    console.log('4. Clear React Native image cache');
  }

  console.log('\n✅ Diagnosis complete!');
}

diagnoseImageIssue().catch(console.error);