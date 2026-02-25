/**
 * Supabase Database Types - User Module
 * Auto-generated from Gandiv_CRM project
 * Regenerate with: MCP Gandiv_CRM generate_typescript_types
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      login_logs: {
        Row: {
          device_info: string | null;
          id: string;
          ip_address: string | null;
          login_time: string;
          user_id: string;
        };
        Insert: {
          device_info?: string | null;
          id?: string;
          ip_address?: string | null;
          login_time?: string;
          user_id: string;
        };
        Update: {
          device_info?: string | null;
          id?: string;
          ip_address?: string | null;
          login_time?: string;
          user_id?: string;
        };
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          plan_type: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          plan_type?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          plan_type?: string | null;
        };
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          role_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          user_id?: string;
        };
      };
      users: {
        Row: {
          created_at: string;
          department: string | null;
          designation: string | null;
          email: string | null;
          employment_type: string | null;
          full_name: string | null;
          id: string;
          organization_id: string | null;
          phone: string | null;
          reporting_manager_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          department?: string | null;
          designation?: string | null;
          email?: string | null;
          employment_type?: string | null;
          full_name?: string | null;
          id: string;
          organization_id?: string | null;
          phone?: string | null;
          reporting_manager_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          department?: string | null;
          designation?: string | null;
          email?: string | null;
          employment_type?: string | null;
          full_name?: string | null;
          id?: string;
          organization_id?: string | null;
          phone?: string | null;
          reporting_manager_id?: string | null;
          status?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          industry: string | null;
          geography: string | null;
          target_designation: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          client_name: string | null;
          lead_type: string | null;
          cpl: number | null;
          revenue: number | null;
          booked: number | null;
          total_allocation: number | null;
          post_qa: number | null;
          achieved: number | null;
          pending_allocation: number | null;
          region: string | null;
          weekly_call: string | null;
          weekly_report: string | null;
          additional_comments: string | null;
          assigned_team_leader_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          industry?: string | null;
          geography?: string | null;
          target_designation?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          client_name?: string | null;
          lead_type?: string | null;
          cpl?: number | null;
          revenue?: number | null;
          booked?: number | null;
          total_allocation?: number | null;
          post_qa?: number | null;
          achieved?: number | null;
          pending_allocation?: number | null;
          region?: string | null;
          weekly_call?: string | null;
          weekly_report?: string | null;
          additional_comments?: string | null;
          assigned_team_leader_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          industry?: string | null;
          geography?: string | null;
          target_designation?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          client_name?: string | null;
          lead_type?: string | null;
          cpl?: number | null;
          revenue?: number | null;
          booked?: number | null;
          total_allocation?: number | null;
          post_qa?: number | null;
          achieved?: number | null;
          pending_allocation?: number | null;
          region?: string | null;
          weekly_call?: string | null;
          weekly_report?: string | null;
          additional_comments?: string | null;
          assigned_team_leader_id?: string | null;
        };
      };
      campaign_assignments: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          agent_id: string;
          assigned_by: string | null;
          assigned_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          agent_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          campaign_id?: string;
          agent_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
          is_active?: boolean;
        };
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          assigned_agent_id: string | null;
          name: string | null;
          company_name: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          status: string;
          followup_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          assigned_agent_id?: string | null;
          name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          status?: string;
          followup_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          campaign_id?: string;
          assigned_agent_id?: string | null;
          name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          status?: string;
          followup_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_organization_id: { Args: Record<string, never>; Returns: string };
      is_org_admin: { Args: { check_user_id?: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
