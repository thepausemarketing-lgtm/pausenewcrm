export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'member'
export type ClientStatus = 'prospect' | 'active' | 'paused' | 'churned'
export type BillingType = 'retainer' | 'project' | 'hourly'
export type CampaignType = 'launch' | 'seasonal' | 'always_on' | 'event' | 'other'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type ContentType = 'post' | 'story' | 'reel' | 'carousel' | 'ad' | 'blog_post' | 'email' | 'video' | 'other'
export type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook' | 'twitter' | 'youtube' | 'email' | 'blog' | 'google_ads' | 'other'
export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'cancelled'
export type TaskCategory = 'strategy' | 'design' | 'copywriting' | 'video_editing' | 'reporting' | 'admin' | 'other'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
export type NotificationType = 'task_assigned' | 'task_due_soon' | 'content_review' | 'comment_mention' | 'campaign_update'
export type EntityType = 'task' | 'content_item' | 'client' | 'campaign'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          role: UserRole
          timezone: string
          is_active: boolean
          designation_id: string | null
          reports_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          role?: UserRole
          timezone?: string
          is_active?: boolean
          designation_id?: string | null
          reports_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          avatar_url?: string | null
          role?: UserRole
          timezone?: string
          is_active?: boolean
          designation_id?: string | null
          reports_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          website: string | null
          industry: string | null
          status: ClientStatus
          billing_type: BillingType
          monthly_value: number | null
          health_score: number | null
          notes: string | null
          currency: string
          parent_client_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          status?: ClientStatus
          billing_type?: BillingType
          monthly_value?: number | null
          health_score?: number | null
          notes?: string | null
          currency?: string
          parent_client_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          status?: ClientStatus
          billing_type?: BillingType
          monthly_value?: number | null
          health_score?: number | null
          notes?: string | null
          currency?: string
          parent_client_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          client_id: string
          full_name: string
          title: string | null
          email: string | null
          phone: string | null
          linkedin_url: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          full_name: string
          title?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          title?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          client_id: string
          name: string
          type: CampaignType
          status: CampaignStatus
          start_date: string | null
          end_date: string | null
          budget: number | null
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          type?: CampaignType
          status?: CampaignStatus
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          client_id?: string
          type?: CampaignType
          status?: CampaignStatus
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          id: string
          client_id: string
          campaign_id: string | null
          title: string
          content_type: ContentType
          platform: Platform
          status: ContentStatus
          caption: string | null
          brief_url: string | null
          publish_at: string | null
          published_at: string | null
          assigned_to: string | null
          reviewed_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          design_date: string | null
          reference_link: string | null
          design_status: string
          internal_review: string
          client_approval: string
          live_links: Record<string, string> | null
          platforms: string[]
        }
        Insert: {
          id?: string
          client_id: string
          campaign_id?: string | null
          title: string
          content_type: ContentType
          platform: Platform
          status?: ContentStatus
          caption?: string | null
          brief_url?: string | null
          publish_at?: string | null
          published_at?: string | null
          assigned_to?: string | null
          reviewed_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          design_date?: string | null
          reference_link?: string | null
          design_status?: string
          internal_review?: string
          client_approval?: string
          live_links?: Record<string, string> | null
          platforms?: string[]
        }
        Update: {
          title?: string
          client_id?: string
          content_type?: ContentType
          platform?: Platform
          status?: ContentStatus
          caption?: string | null
          brief_url?: string | null
          publish_at?: string | null
          published_at?: string | null
          assigned_to?: string | null
          reviewed_by?: string | null
          updated_at?: string
          design_date?: string | null
          reference_link?: string | null
          design_status?: string
          internal_review?: string
          client_approval?: string
          live_links?: Record<string, string> | null
          platforms?: string[]
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          client_id: string | null
          campaign_id: string | null
          content_item_id: string | null
          parent_task_id: string | null
          title: string
          description: string | null
          category: TaskCategory
          priority: TaskPriority
          status: TaskStatus
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          assigned_to: string | null
          created_by: string | null
          position: number | null
          recurrence_type: string
          recurrence_interval: number
          recurrence_end_date: string | null
          recurrence_parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          campaign_id?: string | null
          content_item_id?: string | null
          parent_task_id?: string | null
          title: string
          description?: string | null
          category?: TaskCategory
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          assigned_to?: string | null
          created_by?: string | null
          position?: number | null
          recurrence_type?: string
          recurrence_interval?: number
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          category?: TaskCategory
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          assigned_to?: string | null
          client_id?: string | null
          position?: number | null
          recurrence_type?: string
          recurrence_interval?: number
          recurrence_end_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          body?: string
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          storage_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          entity_type: EntityType
          entity_id: string
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          entity_type: EntityType
          entity_id: string
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          file_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string | null
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          body?: string | null
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']

export interface Designation {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type ContentItem = Database['public']['Tables']['content_items']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskComment = Database['public']['Tables']['task_comments']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
