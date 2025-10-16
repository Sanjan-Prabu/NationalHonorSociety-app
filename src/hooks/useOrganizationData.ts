import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Event, 
  VolunteerHours, 
  DatabaseTable, 
  DATABASE_TABLES,
  EventCategory,
  VolunteerHoursStatus 
} from '../types/database';

// Base interface for organization-scoped data
export interface BaseOrganizationData {
  id: string;
  org_id: string; // UUID reference to organizations table
  created_at: string;
  updated_at?: string;
}

// Legacy interface for backward compatibility
export interface LegacyBaseOrganizationData {
  id: string;
  organization: string; // Legacy text-based organization reference
  created_at: string;
  updated_at?: string;
}

// Announcement interface (not yet in main database schema)
export interface AnnouncementData extends LegacyBaseOrganizationData {
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'event' | 'reminder';
  author_id: string;
  author_name?: string;
}

// Event data interface extending the database Event type
export interface EventData extends Event {
  // Additional computed fields for UI
  date?: string; // Derived from starts_at for backward compatibility
  start_time?: string; // Derived from starts_at
  end_time?: string; // Derived from ends_at
  category?: EventCategory; // From metadata.category
  max_participants?: number; // From metadata.max_attendees
  current_participants?: number; // Computed field
}

// Volunteer hours data interface extending the database VolunteerHours type
export interface VolunteerHoursData extends VolunteerHours {
  // Additional computed fields for UI
  member_name?: string; // Joined from profiles table
  reviewed_by_name?: string; // Joined from profiles table
}

// Generic hook for organization-filtered data
export function useOrganizationData<T extends BaseOrganizationData | LegacyBaseOrganizationData>(
  tableName: DatabaseTable | string,
  options: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    filters?: Record<string, any>;
    useLegacyOrgField?: boolean; // Whether to use 'organization' field instead of 'org_id'
  } = {}
) {
  const { organizationId, organizationSlug } = useOrganization();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { orderBy = 'created_at', ascending = false, limit, filters = {}, useLegacyOrgField = false } = options;

  const fetchData = useCallback(async () => {
    const orgIdentifier = useLegacyOrgField ? organizationSlug : organizationId;
    const orgFieldName = useLegacyOrgField ? 'organization' : 'org_id';
    
    if (!orgIdentifier || (limit !== undefined && limit <= 0)) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from(tableName)
        .select('*')
        .eq(orgFieldName, orgIdentifier);

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      query = query.order(orderBy, { ascending });

      // Apply limit if specified
      if (limit) {
        query = query.limit(limit);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(result || []);
      console.log(`✅ Fetched ${result?.length || 0} ${tableName} records for ${orgIdentifier}`);
    } catch (err) {
      console.error(`❌ Error fetching ${tableName}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, organizationSlug, tableName, orderBy, ascending, limit, useLegacyOrgField, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

// Specific hooks for different data types
export const useAnnouncements = (limit?: number) => {
  return useOrganizationData<AnnouncementData>('announcements', {
    orderBy: 'created_at',
    ascending: false,
    limit,
    useLegacyOrgField: true, // Announcements still use legacy 'organization' field
  });
};

export const useEvents = (limit?: number) => {
  return useOrganizationData<EventData>(DATABASE_TABLES.EVENTS, {
    orderBy: 'starts_at',
    ascending: true,
    limit,
    useLegacyOrgField: false, // Events use new 'org_id' field
  });
};

export const useVolunteerHours = (status?: VolunteerHoursStatus) => {
  const filters = status ? { status } : {};
  return useOrganizationData<VolunteerHoursData>(DATABASE_TABLES.VOLUNTEER_HOURS, {
    orderBy: 'created_at',
    ascending: false,
    filters,
    useLegacyOrgField: false, // Volunteer hours use new 'org_id' field
  });
};

// Hook for officer-specific data (volunteer hours to review)
export const usePendingVolunteerHours = () => {
  return useVolunteerHours('pending');
};

// Hook for member-specific data (their own volunteer hours)
export const useMyVolunteerHours = (memberId: string) => {
  return useOrganizationData<VolunteerHoursData>('volunteer_hours', {
    orderBy: 'created_at',
    ascending: false,
    filters: { member_id: memberId },
  });
};

export default useOrganizationData;