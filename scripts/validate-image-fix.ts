#!/usr/bin/env npx tsx

/**
 * Validation script to verify the permanent image fix is working
 * Tests both database URLs and actual image accessibility
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  table: string;
  id: string;
  url: string;
  status: 'valid' | 'invalid' | 'inaccessible';
  error?: string;
}

async function validateImageUrl(url: string): Promise<{ accessible: boolean; error?: string }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return { accessible: response.ok };
  } catch (error) {
    return { 
      accessible: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function validateImages(): Promise<void> {
  console.log('🔍 Starting image validation...\n');

  const results: ValidationResult[] = [];

  // Check announcements
  console.log('📢 Checking announcement images...');
  const { data: announcements, error: announcementError } = await supabase
    .from('announcements')
    .select('id, image_url')
    .not('image_url', 'is', null);

  if (announcementError) {
    console.error('❌ Error fetching announcements:', announcementError);
    return;
  }

  for (const announcement of announcements || []) {
    const url = announcement.image_url;
    
    // Check URL format - custom domain URLs are the working ones
    if (url.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
      // Check if image is accessible
      const { accessible, error } = await validateImageUrl(url);
      results.push({
        table: 'announcements',
        id: announcement.id,
        url,
        status: accessible ? 'valid' : 'inaccessible',
        error
      });
    } else if (url.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
      results.push({
        table: 'announcements',
        id: announcement.id,
        url,
        status: 'invalid',
        error: 'Using non-working direct R2 format'
      });
    } else {
      results.push({
        table: 'announcements',
        id: announcement.id,
        url,
        status: 'invalid',
        error: 'Unknown URL format'
      });
    }
  }

  // Check events
  console.log('📅 Checking event images...');
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, image_url')
    .not('image_url', 'is', null);

  if (eventError) {
    console.error('❌ Error fetching events:', eventError);
    return;
  }

  for (const event of events || []) {
    const url = event.image_url;
    
    // Check URL format - custom domain URLs are the working ones
    if (url.includes('pub-8eafccb788484d2db8560b92e1252627.r2.dev')) {
      // Check if image is accessible
      const { accessible, error } = await validateImageUrl(url);
      results.push({
        table: 'events',
        id: event.id,
        url,
        status: accessible ? 'valid' : 'inaccessible',
        error
      });
    } else if (url.includes('147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/')) {
      results.push({
        table: 'events',
        id: event.id,
        url,
        status: 'invalid',
        error: 'Using non-working direct R2 format'
      });
    } else {
      results.push({
        table: 'events',
        id: event.id,
        url,
        status: 'invalid',
        error: 'Unknown URL format'
      });
    }
  }

  // Generate report
  console.log('\n📊 VALIDATION RESULTS:');
  console.log('='.repeat(50));

  const validCount = results.filter(r => r.status === 'valid').length;
  const invalidCount = results.filter(r => r.status === 'invalid').length;
  const inaccessibleCount = results.filter(r => r.status === 'inaccessible').length;

  console.log(`✅ Valid images: ${validCount}`);
  console.log(`❌ Invalid URL format: ${invalidCount}`);
  console.log(`⚠️  Inaccessible images: ${inaccessibleCount}`);
  console.log(`📊 Total images checked: ${results.length}`);

  if (invalidCount > 0) {
    console.log('\n❌ INVALID URL FORMATS:');
    results
      .filter(r => r.status === 'invalid')
      .forEach(r => {
        console.log(`  ${r.table}/${r.id}: ${r.error}`);
        console.log(`    URL: ${r.url.substring(0, 80)}...`);
      });
  }

  if (inaccessibleCount > 0) {
    console.log('\n⚠️  INACCESSIBLE IMAGES:');
    results
      .filter(r => r.status === 'inaccessible')
      .forEach(r => {
        console.log(`  ${r.table}/${r.id}: ${r.error || 'HTTP error'}`);
        console.log(`    URL: ${r.url.substring(0, 80)}...`);
      });
  }

  if (validCount === results.length) {
    console.log('\n🎉 ALL IMAGES ARE VALID AND ACCESSIBLE!');
    console.log('The permanent image fix is working correctly.');
  } else {
    console.log('\n⚠️  Some issues found. Please review the results above.');
  }

  console.log('\n✅ Validation complete!');
}

// Run validation
validateImages().catch(console.error);