import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🚀 Minimal presigned URL function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('📝 Parsing request body...');
    const body = await req.json();
    console.log('📝 Request body:', body);

    // Simple R2 config
    const r2Config = {
      accountId: '147322994f8cbee5b63de04ff2919a74',
      accessKeyId: '460f3a09c7b80d16199a5f0828671670',
      secretAccessKey: '8227bedfc2ac9582f5e85bac61ec17e5f9bd3bbf0e92d5f899ca1f33cb2aff5f',
      endpoint: 'https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com',
      privateBucketName: 'nhs-app-private-dev'
    };

    console.log('🔧 Creating S3 client...');
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey
      },
      forcePathStyle: true
    });

    console.log('🔑 Generating presigned URL for:', body.imagePath);
    const command = new GetObjectCommand({
      Bucket: r2Config.privateBucketName,
      Key: body.imagePath
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    console.log('✅ Presigned URL generated successfully');
    
    return new Response(JSON.stringify({
      presignedUrl,
      expiresAt
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate presigned URL',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});