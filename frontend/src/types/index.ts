export type Environment = "sandbox" | "production";
export type UserRole = "admin" | "developer";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  status: "active" | "invited";
  created_at: string;
}

export interface InviteUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface InviteUserResponse extends ManagedUser {
  invite_url: string;
  warning?: string;
}

export interface APIKey {
  id: number;
  name: string;
  prefix: string;
  environment: Environment;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  raw_key?: string;
}

export interface SESIntegration {
  id: number;
  name: string;
  environment: Environment;
  region: string;
  sender_email: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSESIntegration {
  name: string;
  aws_access_key: string;
  aws_secret_key: string;
  region: string;
  sender_email: string;
}

export interface Placeholder {
  name: string;
  default_value: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  environment: Environment;
  subject: string;
  html_content: string;
  design_json: Record<string, unknown> | null;
  placeholders: Placeholder[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string;
  environment: Environment;
  template: number | null;
  template_name: string | null;
  integration: number | null;
  integration_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEvent {
  name: string;
  description: string;
  template: number | null;
  integration: number | null;
  is_active: boolean;
}

export interface EmailLog {
  id: number;
  environment: Environment;
  event: number | null;
  event_name: string | null;
  event_slug: string | null;
  template: number | null;
  template_name: string | null;
  integration: number | null;
  integration_name: string | null;
  recipient: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'complained';
  ses_message_id: string;
  error_message: string;
  metadata: Record<string, unknown>;
  sent_at: string;
}

export interface DashboardStats {
  total_sent: number;
  total_failed: number;
  sent_today: number;
  sent_last_7_days: number;
  sent_last_30_days: number;
  active_integrations: number;
  active_events: number;
  total_templates: number;
  daily_breakdown: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
  recent_logs: EmailLog[];
}

export interface BrandComponent {
  id: number;
  name: string;
  category: "header" | "footer" | "content" | "logo" | "other";
  category_display: string;
  html_content: string;
  thumbnail_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandComponent {
  name: string;
  category: string;
  html_content: string;
  thumbnail_url?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
