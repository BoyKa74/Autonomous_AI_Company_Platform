export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChannelPlatform =
  | "youtube"
  | "tiktok"
  | "facebook"
  | "book"
  | "media"
  | "shopee"
  | "tiktok_shop"
  | "other";

export type ChannelStatus = "active" | "paused" | "draft" | "archived";

export type ContentKind =
  | "video"
  | "short"
  | "post"
  | "article"
  | "book_chapter"
  | "product_listing"
  | "other";

export type ContentStatus =
  | "idea"
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type ProfileRole = "user" | "admin";

export type MediaKind = "music" | "voice" | "video" | "image" | "subtitle";

export type MediaJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type CompanyVertical =
  | "affiliate"
  | "publishing"
  | "media"
  | "software"
  | "other";

export type CompanyStatus = "draft" | "active" | "paused" | "archived";

export type AgentRole = "super_admin" | "ceo" | "manager" | "specialist" | "worker";

export type AgentStatus = "active" | "paused";

export type AgentTaskStatus =
  | "queued"
  | "running"
  | "review"
  | "approved"
  | "rejected"
  | "failed"
  | "canceled";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: ProfileRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          platform: ChannelPlatform;
          handle: string | null;
          url: string | null;
          region: string;
          status: ChannelStatus;
          goal: string | null;
          notes: string | null;
          followers: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          platform: ChannelPlatform;
          handle?: string | null;
          url?: string | null;
          region?: string;
          status?: ChannelStatus;
          goal?: string | null;
          notes?: string | null;
          followers?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          platform?: ChannelPlatform;
          handle?: string | null;
          url?: string | null;
          region?: string;
          status?: ChannelStatus;
          goal?: string | null;
          notes?: string | null;
          followers?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_items: {
        Row: {
          id: string;
          owner_id: string;
          channel_id: string | null;
          title: string;
          kind: ContentKind;
          status: ContentStatus;
          content: string | null;
          ai_provider: string | null;
          scheduled_for: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          channel_id?: string | null;
          title: string;
          kind?: ContentKind;
          status?: ContentStatus;
          content?: string | null;
          ai_provider?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          channel_id?: string | null;
          title?: string;
          kind?: ContentKind;
          status?: ContentStatus;
          content?: string | null;
          ai_provider?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      media_jobs: {
        Row: {
          id: string;
          owner_id: string;
          channel_id: string | null;
          kind: MediaKind;
          status: MediaJobStatus;
          prompt: string;
          params: Json;
          provider: string | null;
          result_url: string | null;
          result_path: string | null;
          error: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          channel_id?: string | null;
          kind: MediaKind;
          status?: MediaJobStatus;
          prompt: string;
          params?: Json;
          provider?: string | null;
          result_url?: string | null;
          result_path?: string | null;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          channel_id?: string | null;
          kind?: MediaKind;
          status?: MediaJobStatus;
          prompt?: string;
          params?: Json;
          provider?: string | null;
          result_url?: string | null;
          result_path?: string | null;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_jobs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_jobs_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          vertical: CompanyVertical;
          mission: string | null;
          status: CompanyStatus;
          autonomy_level: number;
          monthly_budget_usd: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          vertical?: CompanyVertical;
          mission?: string | null;
          status?: CompanyStatus;
          autonomy_level?: number;
          monthly_budget_usd?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          vertical?: CompanyVertical;
          mission?: string | null;
          status?: CompanyStatus;
          autonomy_level?: number;
          monthly_budget_usd?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agents: {
        Row: {
          id: string;
          company_id: string;
          parent_id: string | null;
          name: string;
          role: AgentRole;
          title: string | null;
          system_prompt: string | null;
          provider: string | null;
          model: string | null;
          max_tokens_per_run: number;
          monthly_budget_usd: number | null;
          status: AgentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parent_id?: string | null;
          name: string;
          role?: AgentRole;
          title?: string | null;
          system_prompt?: string | null;
          provider?: string | null;
          model?: string | null;
          max_tokens_per_run?: number;
          monthly_budget_usd?: number | null;
          status?: AgentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          parent_id?: string | null;
          name?: string;
          role?: AgentRole;
          title?: string | null;
          system_prompt?: string | null;
          provider?: string | null;
          model?: string | null;
          max_tokens_per_run?: number;
          monthly_budget_usd?: number | null;
          status?: AgentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_agents_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_tasks: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string;
          agent_id: string | null;
          parent_task_id: string | null;
          title: string;
          brief: string | null;
          status: AgentTaskStatus;
          requires_approval: boolean;
          estimate_usd: number;
          actual_usd: number;
          estimate_tokens: number;
          actual_tokens: number;
          result: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          company_id: string;
          agent_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          brief?: string | null;
          status?: AgentTaskStatus;
          requires_approval?: boolean;
          estimate_usd?: number;
          actual_usd?: number;
          estimate_tokens?: number;
          actual_tokens?: number;
          result?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string;
          agent_id?: string | null;
          parent_task_id?: string | null;
          title?: string;
          brief?: string | null;
          status?: AgentTaskStatus;
          requires_approval?: boolean;
          estimate_usd?: number;
          actual_usd?: number;
          estimate_tokens?: number;
          actual_tokens?: number;
          result?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_tasks_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_tasks_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
        ];
      };
      cost_ledger: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          agent_id: string | null;
          task_id: string | null;
          provider: string;
          model: string | null;
          purpose: string | null;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          company_id?: string | null;
          agent_id?: string | null;
          task_id?: string | null;
          provider: string;
          model?: string | null;
          purpose?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          agent_id?: string | null;
          task_id?: string | null;
          provider?: string;
          model?: string | null;
          purpose?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cost_ledger_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cost_ledger_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cost_ledger_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cost_ledger_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "agent_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_settings: {
        Row: {
          owner_id: string;
          monthly_budget_usd: number;
          alert_threshold_pct: number;
          hard_stop: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          monthly_budget_usd?: number;
          alert_threshold_pct?: number;
          hard_stop?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          monthly_budget_usd?: number;
          alert_threshold_pct?: number;
          hard_stop?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_settings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      claim_media_jobs: {
        Args: { batch_size?: number };
        Returns: Database["public"]["Tables"]["media_jobs"]["Row"][];
      };
    };
    Enums: {
      channel_platform: ChannelPlatform;
      channel_status: ChannelStatus;
      content_kind: ContentKind;
      content_status: ContentStatus;
      media_job_status: MediaJobStatus;
      media_kind: MediaKind;
      profile_role: ProfileRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Channel = Database["public"]["Tables"]["channels"]["Row"];
export type ChannelInsert = Database["public"]["Tables"]["channels"]["Insert"];
export type ChannelUpdate = Database["public"]["Tables"]["channels"]["Update"];
export type ContentItem = Database["public"]["Tables"]["content_items"]["Row"];
export type ContentItemInsert =
  Database["public"]["Tables"]["content_items"]["Insert"];
export type MediaJob = Database["public"]["Tables"]["media_jobs"]["Row"];
export type MediaJobInsert =
  Database["public"]["Tables"]["media_jobs"]["Insert"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type AiAgent = Database["public"]["Tables"]["ai_agents"]["Row"];
export type AiAgentInsert = Database["public"]["Tables"]["ai_agents"]["Insert"];
export type AgentTask = Database["public"]["Tables"]["agent_tasks"]["Row"];
export type CostLedgerEntry = Database["public"]["Tables"]["cost_ledger"]["Row"];
export type AiSettings = Database["public"]["Tables"]["ai_settings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
