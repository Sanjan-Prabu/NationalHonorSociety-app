-- Migration: UUID Schema Standardization
-- Task 2: Implement UUID schema standardization
-- Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Task 2.1: Create organizations table with UUID primary key
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS '
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
' LANGUAGE plpgsql;

-- Create trigger for organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Task 2.2 & 2.3: Add org_id columns to organizational tables

-- Add org_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to verification_codes table  
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to volunteer_hours table
ALTER TABLE volunteer_hours ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to ble_badges table
ALTER TABLE ble_badges ADD COLUMN IF NOT EXISTS org_id UUID;

-- Add org_id to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS org_id UUID;

-- Create helper function for populating org_id from default organization
CREATE OR REPLACE FUNCTION populate_org_id_from_default(table_name TEXT, default_org_slug TEXT DEFAULT 'nhs')
RETURNS INTEGER AS '
DECLARE
    updated_count INTEGER;
    default_org_id UUID;
    sql_query TEXT;
BEGIN
    -- Get the default organization ID
    SELECT id INTO default_org_id FROM organizations WHERE slug = default_org_slug LIMIT 1;
    
    IF default_org_id IS NULL THEN
        RAISE EXCEPTION ''Default organization with slug % not found'', default_org_slug;
    END IF;
    
    -- Build and execute update query
    sql_query := ''UPDATE '' || quote_ident(table_name) || '' SET org_id = $1 WHERE org_id IS NULL'';
    EXECUTE sql_query USING default_org_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE ''Updated % records in table % with default org_id %'', updated_count, table_name, default_org_id;
    
    RETURN updated_count;
END;
' LANGUAGE plpgsql;