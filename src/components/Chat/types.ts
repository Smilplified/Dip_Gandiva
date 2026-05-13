export type ConversationTab = "all" | "mine" | "unread";

/** Active campaigns with a client — from `GET /api/chat/campaigns` (Supabase Gandiv_CRM). */
export interface ChatInboxCampaign {
  id: string;
  campaignId: string;
  name: string;
  clientName: string | null;
  clientId: string;
}

export interface Conversation {
  leadId: string;
  companyName: string;
  initials: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedTo: string;
  campaignName: string;
  /** `campaigns.id` — used to filter inbox by selected campaign */
  campaignUuid?: string;
  stage: string;
  /** For avatar background */
  avatarHue: number;
  /** ISO date of first WhatsApp contact */
  firstContactAt: string;
  showTyping?: boolean;
}

export interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read" | "failed";
}
