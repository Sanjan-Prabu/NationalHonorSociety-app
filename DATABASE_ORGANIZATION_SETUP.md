# Database Setup for Multi-Organization Support

## Overview

This guide explains how to set up your Supabase database to support multiple organizations (NHS and NHSA) with shared screens and organization-filtered data.

## Database Schema Changes

### 1. Update Users/Profiles Table

Your existing `profiles` table should include an `organization` field:

```sql
-- Add organization column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization TEXT NOT NULL DEFAULT 'NHS';

-- Add constraint to ensure valid organization values
ALTER TABLE profiles 
ADD CONSTRAINT valid_organization 
CHECK (organization IN ('NHS', 'NHSA'));

-- Create index for faster organization-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization);
```

### 2. Create Organizations Table (Optional)

For more advanced organization management:

```sql
-- Create organizations table for future expansion
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('NHS', 'NHSA')),
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default organizations
INSERT INTO organizations (id, name, display_name, type, description) VALUES
('NHS', 'NHS', 'National Honor Society', 'NHS', 'National Honor Society chapter focused on scholarship, service, leadership, and character'),
('NHSA', 'NHSA', 'National Honor Society Associated', 'NHSA', 'National Honor Society Associated chapter with specialized programs and initiatives')
ON CONFLICT (id) DO NOTHING;
```

### 3. Create Organization-Aware Data Tables

#### Announcements Table
```sql
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'urgent', 'event', 'reminder')),
  organization TEXT NOT NULL REFERENCES organizations(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_announcements_organization ON announcements(organization);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
```

#### Events Table
```sql
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'volunteer' CHECK (category IN ('volunteer', 'meeting', 'social', 'fundraising')),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  organization TEXT NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
```

#### Volunteer Hours Table
```sql
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id),
  member_name TEXT,
  event_name TEXT NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  description TEXT,
  proof_image TEXT,
  organization TEXT NOT NULL REFERENCES organizations(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_organization ON volunteer_hours(organization);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_member ON volunteer_hours(member_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_status ON volunteer_hours(status);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
```

### Create RLS Policies

#### Announcements Policies
```sql
-- Users can only see announcements from their organization
CREATE POLICY "Users can view announcements from their organization" ON announcements
  FOR SELECT USING (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
  );

-- Officers can create announcements for their organization
CREATE POLICY "Officers can create announcements for their organization" ON announcements
  FOR INSERT WITH CHECK (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer'
  );

-- Officers can update their own announcements
CREATE POLICY "Officers can update their own announcements" ON announcements
  FOR UPDATE USING (
    author_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer'
  );
```

#### Events Policies
```sql
-- Users can view events from their organization
CREATE POLICY "Users can view events from their organization" ON events
  FOR SELECT USING (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
  );

-- Officers can create events for their organization
CREATE POLICY "Officers can create events for their organization" ON events
  FOR INSERT WITH CHECK (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer'
  );

-- Officers can update events they created
CREATE POLICY "Officers can update their own events" ON events
  FOR UPDATE USING (
    created_by = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer'
  );
```

#### Volunteer Hours Policies
```sql
-- Users can view volunteer hours from their organization
CREATE POLICY "Users can view volunteer hours from their organization" ON volunteer_hours
  FOR SELECT USING (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    AND (
      member_id = auth.uid() -- Members can see their own hours
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer' -- Officers can see all hours in their org
    )
  );

-- Members can create volunteer hour entries for themselves
CREATE POLICY "Members can create their own volunteer hours" ON volunteer_hours
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    AND organization = (SELECT organization FROM profiles WHERE id = auth.uid())
  );

-- Officers can update volunteer hour status (approve/reject)
CREATE POLICY "Officers can update volunteer hour status" ON volunteer_hours
  FOR UPDATE USING (
    organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'officer'
  );
```

## Sample Data

### Insert Sample Organizations Data
```sql
-- Sample announcements
INSERT INTO announcements (title, content, type, organization, author_id, author_name) VALUES
('NHS Welcome Meeting', 'Welcome to the new school year! Join us for our first NHS meeting.', 'general', 'NHS', (SELECT id FROM profiles WHERE role = 'officer' AND organization = 'NHS' LIMIT 1), 'NHS Officer'),
('NHSA Volunteer Opportunity', 'Beach cleanup this Saturday! Sign up now.', 'event', 'NHSA', (SELECT id FROM profiles WHERE role = 'officer' AND organization = 'NHSA' LIMIT 1), 'NHSA Officer');

-- Sample events
INSERT INTO events (title, description, date, start_time, end_time, location, category, organization, created_by) VALUES
('NHS Beach Cleanup', 'Monthly beach cleanup event for NHS members', CURRENT_DATE + INTERVAL '7 days', '09:00', '12:00', 'Sunset Beach', 'volunteer', 'NHS', (SELECT id FROM profiles WHERE role = 'officer' AND organization = 'NHS' LIMIT 1)),
('NHSA Food Drive', 'Collect food donations for local food bank', CURRENT_DATE + INTERVAL '14 days', '10:00', '15:00', 'School Cafeteria', 'volunteer', 'NHSA', (SELECT id FROM profiles WHERE role = 'officer' AND organization = 'NHSA' LIMIT 1));
```

## Testing Organization Separation

### Test Queries

1. **Test organization filtering for announcements:**
```sql
-- Should only return NHS announcements for NHS users
SELECT * FROM announcements WHERE organization = 'NHS';

-- Should only return NHSA announcements for NHSA users  
SELECT * FROM announcements WHERE organization = 'NHSA';
```

2. **Test RLS policies:**
```sql
-- Set session to simulate NHS user
SELECT set_config('request.jwt.claims', '{"sub": "' || (SELECT id FROM profiles WHERE organization = 'NHS' LIMIT 1) || '"}', true);

-- This should only return NHS data
SELECT * FROM announcements;
SELECT * FROM events;
```

## Migration Steps

1. **Backup your current database**
2. **Run the schema updates** (add organization columns and constraints)
3. **Update existing data** to have proper organization values
4. **Create new tables** (announcements, events, volunteer_hours)
5. **Set up RLS policies**
6. **Test with sample data**
7. **Update your app** to use the new organization-aware hooks

## Verification Checklist

- [ ] Profiles table has `organization` column
- [ ] All data tables have `organization` column with proper constraints
- [ ] RLS policies are enabled and working
- [ ] Sample data exists for both NHS and NHSA
- [ ] Organization filtering works in app
- [ ] Users only see their organization's data
- [ ] Officers can only manage their organization's data

This setup ensures complete data separation between organizations while using shared UI components.