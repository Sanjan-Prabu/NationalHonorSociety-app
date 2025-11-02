#!/usr/bin/env npx tsx

/**
 * Test script to check which URL variants work for existing images
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function testUrlVariants(): Promise<void> {
  console.log('🔍 Testing URL variants for existing images...\n');

  // Get one sample URL
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
  console.log('Sample URL from database:', sampleUrl);

  // Generate variants
  const variants = [
    sampleUrl,
    sampleUrl.replace(
      'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com/nhs-app-public-dev/',
      'https://pub-8eafccb788484d2db8560b92e1252627.r2.dev/'
    )
  ];

  console.log('\nTesting variants:');
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const works = await testUrl(variant);
    console.log(`${i + 1}. ${works ? '✅' : '❌'} ${variant}`);
  }
}

testUrlVariants().catch(console.error);