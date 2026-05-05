import type { Platform, ContentType, ContentStatus, TaskStatus, TaskPriority, TaskCategory, ClientStatus, CampaignStatus } from '@/types/database.types'

export const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: '#E1306C' },
  { value: 'linkedin', label: 'LinkedIn', color: '#0077B5' },
  { value: 'tiktok', label: 'TikTok', color: '#010101' },
  { value: 'facebook', label: 'Facebook', color: '#1877F2' },
  { value: 'twitter', label: 'Twitter/X', color: '#000000' },
  { value: 'youtube', label: 'YouTube', color: '#FF0000' },
  { value: 'email', label: 'Email', color: '#F97316' },
  { value: 'blog', label: 'Blog', color: '#16A34A' },
  { value: 'google_ads', label: 'Google Ads', color: '#FBBC04' },
  { value: 'other', label: 'Other', color: '#6B7280' },
]

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'single_image', label: 'Single Image' },
  { value: 'ad', label: 'Ad' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'email', label: 'Email' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

export const CONTENT_STATUSES: { value: ContentStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#6B7280' },
  { value: 'in_review', label: 'In Review', color: '#F59E0B' },
  { value: 'approved', label: 'Approved', color: '#3B82F6' },
  { value: 'scheduled', label: 'Scheduled', color: '#8B5CF6' },
  { value: 'published', label: 'Published', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
]

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: '#6B7280' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'review', label: 'Review', color: '#F59E0B' },
  { value: 'done', label: 'Done', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
]

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'design', label: 'Design' },
  { value: 'copywriting', label: 'Copywriting' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Other' },
]

export const CLIENT_STATUSES: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'prospect', label: 'Prospect', color: '#6B7280' },
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'paused', label: 'Paused', color: '#F59E0B' },
  { value: 'churned', label: 'Churned', color: '#EF4444' },
]

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#6B7280' },
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'paused', label: 'Paused', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', color: '#3B82F6' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
]

export const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'Education',
  'Real Estate', 'Food & Beverage', 'Fashion', 'Travel', 'Media',
  'Non-profit', 'Manufacturing', 'Automotive', 'Beauty', 'Sports',
  'Legal', 'Consulting', 'Entertainment', 'Other',
]

export const getPlatformColor = (platform: Platform): string =>
  PLATFORMS.find(p => p.value === platform)?.color ?? '#6B7280'

export const getPlatformLabel = (platform: Platform): string =>
  PLATFORMS.find(p => p.value === platform)?.label ?? platform
