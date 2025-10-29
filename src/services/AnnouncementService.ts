/**
 * AnnouncementService - Handles announcement data operations with CRUD functionality
 * Implements organization-filtered announcement queries with soft deletion and realtime support
 * Requirements: 1.1, 1.2, 1.5, 4.1, 4.2, 4.4, 6.1, 6.2, 6.3, 6.4
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  ApiResponse
} from '../types/dataService';
import { UUID } from '../types/database';

// =============================================================================
// ANNOUNCEMENT INTERFACES
// =============================================================================

export interface Announcement {
  id: UUID;
  org_id: UUID;
  created_by: UUID;
  tag?: string;
  title: string;
  message?: string;
  link?: string;
  image_url?: string; // Phase 2
  status: 'active' | 'deleted' | 'archived';
  deleted_by?: UUID;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  creator_name?: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  message?: string;
  tag?: string;
  link?: string;
  image_url?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  message?: string;
  tag?: string;
  link?: string;
}

export interface AnnouncementFilters {
  tag?: string;
  createdBy?: UUID;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// ANNOUNCEMENT SERVICE CLASS
// =============================================================================

export class AnnouncementService extends BaseDataService {
  constructor() {
    super('AnnouncementService');
  }

  /**
   * Creates a new announcement with server-side org_id resolution
   * Requirements: 1.1, 1.2, 1.5
   */
  async createAnnouncement(
    announcementData: CreateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = await this.getCurrentOrganizationId();

      // Validate required fields
      this.validateRequiredFields(announcementData, ['title']);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(announcementData);

      // Prepare announcement data for insertion
      const newAnnouncement = {
        ...sanitizedData,
        org_id: organizationId, // Server-side org_id resolution
        created_by: userId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await this.executeMutation<any>(
        supabase
          .from('announcements')
          .insert(newAnnouncement)
          .select('*')
          .single(),
        'createAnnouncement',
        this.createPermissionContext('create_announcement', {
          requiredRole: 'officer',
          organizationId
        })
      );

      if (result.success && result.data) {
        const announcement = result.data as any;
        
        // Fetch creator info for the newly created announcement
        if (announcement.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name')
            .eq('id', announcement.created_by)
            .single();
          announcement.creator = creator;
        }
        
        const transformedAnnouncement = this.transformAnnouncementData(announcement);
        
        this.log('info', 'Announcement created successfully', { 
          announcementId: transformedAnnouncement.id, 
          title: transformedAnnouncement.title,
          orgId: organizationId 
        });

        return {
          data: transformedAnnouncement,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to create announcement', { announcementData, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Fetches announcements with organization filtering and status='active'
   * Requirements: 1.1, 1.2, 1.5
   */
  async fetchAnnouncements(
    filters?: AnnouncementFilters,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<Announcement[]>> {
    try {
      const organizationId = await this.getCurrentOrganizationId();

      let query = supabase
        .from('announcements')
        .select('*')
        .eq('org_id', organizationId)
        .eq('status', 'active') // Only fetch active announcements
        .order('created_at', { ascending: false });

      // Apply filters safely
      if (filters) {
        if (filters.tag) {
          query = query.eq('tag', filters.tag);
        }
        if (filters.createdBy) {
          query = query.eq('created_by', filters.createdBy);
        }
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      const result = await this.executeQuery<any[]>(
        query, 
        'fetchAnnouncements',
        this.createPermissionContext('view_announcements', {
          organizationId
        })
      );

      if (result.success && result.data) {
        // Transform database announcements to Announcement format
        const announcements = result.data as any[];
        // Fetch all unique creator IDs
        const creatorIds = [...new Set(announcements.map(a => a.created_by).filter(Boolean))];
        
        let creators = null;
        let creatorsError = null;
        
        // Only fetch creators if we have IDs
        if (creatorIds.length > 0) {
          const result = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name')
            .in('id', creatorIds);
          creators = result.data;
          creatorsError = result.error;
        }

        if (creatorsError) {
          this.log('error', 'Failed to fetch creators', { error: creatorsError.message });
        }

        // Create a map for quick lookup
        const creatorMap = new Map();
        if (creators) {
          creators.forEach(creator => {
            creatorMap.set(creator.id, creator);
          });
        }

        // Transform announcements with creator info
        const transformedAnnouncements = announcements.map((announcement: any) => {
          if (announcement.created_by) {
            announcement.creator = creatorMap.get(announcement.created_by);
          }
          return this.transformAnnouncementData(announcement);
        });

        return {
          data: transformedAnnouncements,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to fetch announcements', { filters, options, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets a single announcement by ID
   */
  async getAnnouncementById(announcementId: UUID): Promise<ApiResponse<Announcement>> {
    try {
      const query = supabase
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .eq('status', 'active') // Only fetch active announcements
        .single();

      const result = await this.executeQuery<any>(
        query, 
        'getAnnouncementById',
        this.createPermissionContext('view_announcement', {
          resource: announcementId
        })
      );

      if (result.success && result.data) {
        const announcement = result.data as any;
        
        // Fetch creator info if needed
        if (announcement.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name')
            .eq('id', announcement.created_by)
            .single();
          announcement.creator = creator;
        }
        
        const transformedAnnouncement = this.transformAnnouncementData(announcement);
        return {
          data: transformedAnnouncement,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get announcement by ID', { announcementId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Soft deletes an announcement with audit trail fields
   * Requirements: 4.1, 4.2, 4.4
   */
  async softDeleteAnnouncement(announcementId: UUID): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = await this.getCurrentOrganizationId();

      // First verify the announcement exists and belongs to the user's organization
      const { data: existingAnnouncement, error: fetchError } = await supabase
        .from('announcements')
        .select('id, org_id, created_by, status')
        .eq('id', announcementId)
        .eq('org_id', organizationId) // Ensure it's in the user's org
        .eq('status', 'active') // Only allow deleting active announcements
        .single();

      if (fetchError || !existingAnnouncement) {
        return {
          data: false,
          error: 'Announcement not found or already deleted',
          success: false,
        };
      }

      // Check if user has officer permissions for this organization
      const hasPermission = await this.hasOfficerPermissions(userId, organizationId);
      if (!hasPermission) {
        return {
          data: false,
          error: 'Permission denied: Officer role required to delete announcements',
          success: false,
        };
      }

      // Perform the soft delete with proper audit trail
      const { error: updateError } = await supabase
        .from('announcements')
        .update({ 
          status: 'deleted',
          deleted_by: userId,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementId)
        .eq('org_id', organizationId);

      if (updateError) {
        this.log('error', 'Failed to soft delete announcement', { 
          announcementId, 
          error: updateError.message,
          userId,
          organizationId
        });
        return {
          data: false,
          error: `Delete failed: ${updateError.message}`,
          success: false,
        };
      }

      this.log('info', 'Announcement soft deleted successfully', { 
        announcementId,
        deletedBy: userId,
        organizationId
      });

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to soft delete announcement', { announcementId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates an existing announcement
   */
  async updateAnnouncement(
    announcementId: UUID, 
    updates: UpdateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> {
    try {
      const userId = await this.getCurrentUserId();

      // Validate that user can update this announcement
      const existingAnnouncement = await this.getAnnouncementById(announcementId);
      if (!existingAnnouncement.success || !existingAnnouncement.data) {
        return {
          data: null,
          error: 'Announcement not found',
          success: false,
        };
      }

      // Check if user is the creator or has officer permissions
      const canUpdate = existingAnnouncement.data.created_by === userId || 
                       await this.hasOfficerPermissions(userId, existingAnnouncement.data.org_id);
      
      if (!canUpdate) {
        return {
          data: null,
          error: 'Permission denied: Cannot update this announcement',
          success: false,
        };
      }

      // Sanitize input
      const sanitizedUpdates = this.sanitizeInput(updates);

      // Add updated timestamp
      const announcementUpdates = {
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      };

      const result = await this.executeMutation<any>(
        supabase
          .from('announcements')
          .update(announcementUpdates)
          .eq('id', announcementId)
          .select('*')
          .single(),
        'updateAnnouncement',
        this.createPermissionContext('update_announcement', {
          requiredRole: 'officer',
          resource: announcementId
        })
      );

      if (result.success && result.data) {
        const announcement = result.data as any;
        
        // Fetch creator info for the updated announcement
        if (announcement.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name')
            .eq('id', announcement.created_by)
            .single();
          announcement.creator = creator;
        }
        
        const transformedAnnouncement = this.transformAnnouncementData(announcement);
        
        this.log('info', 'Announcement updated successfully', { 
          announcementId, 
          updates: Object.keys(updates) 
        });

        return {
          data: transformedAnnouncement,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update announcement', { announcementId, updates, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // REALTIME SUBSCRIPTION SUPPORT
  // =============================================================================

  /**
   * Creates organization-scoped Supabase realtime subscription for announcements
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async subscribeToAnnouncements(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Announcement | null;
      old: Announcement | null;
    }) => void,
    filters?: AnnouncementFilters
  ): Promise<() => void> {
    try {
      const organizationId = await this.getCurrentOrganizationId();
      
      // Create organization-scoped subscription
      const subscription = supabase
        .channel(`announcements_${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'announcements',
            filter: `org_id=eq.${organizationId}`
          },
          async (payload: any) => {
            this.log('info', 'Received realtime announcement update', {
              eventType: payload.eventType,
              announcementId: payload.new?.id || payload.old?.id
            });

            // Transform the data before calling callback
            let transformedNew: Announcement | null = null;
            let transformedOld: Announcement | null = null;

            if (payload.new) {
              // Fetch creator info for new record
              if (payload.new.created_by) {
                const { data: creator } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, display_name')
                  .eq('id', payload.new.created_by)
                  .single();
                payload.new.creator = creator;
              }
              transformedNew = this.transformAnnouncementData(payload.new);
            }

            if (payload.old) {
              transformedOld = this.transformAnnouncementData(payload.old);
            }

            // Handle different event types appropriately
            if (payload.eventType === 'INSERT' && transformedNew && transformedNew.status === 'active') {
              // Only show new active announcements
              callback({
                eventType: 'INSERT',
                new: transformedNew,
                old: null,
              });
            } else if (payload.eventType === 'UPDATE') {
              // Handle status changes (like soft deletes)
              const wasActive = payload.old?.status === 'active';
              const isActive = transformedNew?.status === 'active';
              
              if (wasActive && !isActive) {
                // Announcement was soft deleted - treat as DELETE for UI
                callback({
                  eventType: 'DELETE',
                  new: null,
                  old: transformedOld,
                });
              } else if (isActive) {
                // Regular update to active announcement
                callback({
                  eventType: 'UPDATE',
                  new: transformedNew,
                  old: transformedOld,
                });
              }
            } else if (payload.eventType === 'DELETE') {
              // Physical deletion (should be rare)
              callback({
                eventType: 'DELETE',
                new: null,
                old: transformedOld,
              });
            }
          }
        )
        .subscribe();

      this.log('info', 'Realtime subscription established for org:', organizationId);
      this.log('info', 'Subscribed to announcements realtime updates', { organizationId });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
        this.log('info', 'Unsubscribed from announcements realtime updates', { organizationId });
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to subscribe to announcements', { error: errorMessage });
      
      // Return no-op cleanup function
      return () => {};
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Transforms database announcement data to Announcement format
   */
  private transformAnnouncementData(announcement: any): Announcement {
    const announcementData: Announcement = {
      id: announcement.id,
      org_id: announcement.org_id,
      created_by: announcement.created_by,
      tag: announcement.tag,
      title: announcement.title,
      message: announcement.message,
      link: announcement.link,
      image_url: announcement.image_url,
      status: announcement.status,
      deleted_by: announcement.deleted_by,
      deleted_at: announcement.deleted_at,
      created_at: announcement.created_at,
      updated_at: announcement.updated_at,
      // Computed fields
      creator_name: announcement.creator ? this.buildDisplayName(announcement.creator) : undefined,
    };

    return announcementData;
  }

  /**
   * Builds display name from profile data
   */
  private buildDisplayName(profile: any): string {
    if (!profile) return 'Unknown User';
    
    if (profile.display_name) return profile.display_name;
    
    const parts = [profile.first_name, profile.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown User';
  }

  /**
   * Checks if user has officer permissions for an organization
   */
  private async hasOfficerPermissions(userId: UUID, orgId: UUID): Promise<boolean> {
    try {
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();

      return membership?.role === 'officer';
    } catch {
      return false;
    }
  }

  /**
   * Override getCurrentOrganizationId to get from user context
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get user's active membership
      const { data: membership } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) {
        throw this.createError('PERMISSION_DENIED', 'User has no active organization membership');
      }

      return membership.org_id;
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', 'Failed to get current organization ID');
    }
  }
}

// Export singleton instance
export const announcementService = new AnnouncementService();