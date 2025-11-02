#!/usr/bin/env npx tsx

/**
 * Test script to verify image URLs are working and accessible
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testImageUrl(url: string, description: string): Promise<void> {
  try {
    console.log(`\n🔍 Testing ${description}:`);
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, { method: 'HEAD' });
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')}`);
    
    if (response.ok) {
      console.log('✅ Image is accessible');
    } else {
      console.log('❌ Image is not accessible');
    }
  } catch (error) {
    console.log('❌ Network error:', error instanceof Error ? error.message : error);
  }
}

async function testImageLoading(): Promise<void> {
  console.log('🔍 Testing image URL accessibility...\n');

  // Get a sample image URL from database
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .limit(1);

  if (!announcements || announcements.length === 0) {
    console.log('No announcements with images found');
    return;
  }

  const sampleUrl = announcements[0].image_url;
  
  // Test the database URL
  await testImageUrl(sampleUrl, 'Database URL');
  
  // Test URL variants
  if (sampleUrl.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
    const directUrl = sampleUrl.replace(
      'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/',
      'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/'
    );
    await testImageUrl(directUrl, 'Direct R2 URL variant');
  }
  
  if (sampleUrl.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
    const customUrl = sampleUrl.replace(
      'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/',
      'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/'
    );
    await testImageUrl(customUrl, 'Custom domain URL variant');
  }

  // Test a few more images
  const { data: events } = await supabase
    .from('events')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .limit(2);

  if (events && events.length > 0) {
    for (let i = 0; i < events.length; i++) {
      await testImageUrl(events[i].image_url, `Event ${i + 1} URL`);
    }
  }

  console.log('\n✅ Image URL testing complete!');
}

testImageLoading().catch(console.error);