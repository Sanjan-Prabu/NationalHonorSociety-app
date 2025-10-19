#!/bin/bash

# Script to deploy the updated signupPublic function

echo "🚀 Deploying signupPublic function with verification code support..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Make sure you're in the root of your project."
    exit 1
fi

echo "📋 Checking function file..."
if [ ! -f "supabase/functions/signupPublic/index.ts" ]; then
    echo "❌ signupPublic function file not found!"
    exit 1
fi

echo "✅ Function file found"

echo "🔄 Deploying function..."
supabase deploy signupPublic

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run the migration to add verification codes:"
    echo "   supabase db push"
    echo ""
    echo "2. Verify the codes exist:"
    echo "   supabase db reset --linked"
    echo "   # or run verify-verification-codes.sql"
    echo ""
    echo "3. Test the function:"
    echo "   ./test-signup-verification.sh"
    echo ""
    echo "🔗 Your function URL:"
    echo "https://your-project.supabase.co/functions/v1/signupPublic"
else
    echo "❌ Function deployment failed!"
    exit 1
fi