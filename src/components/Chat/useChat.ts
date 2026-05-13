"use client";

/**
 * Chat data + realtime hook.
 *
 * Campaigns: `GET /api/chat/campaigns` (Supabase) — active campaigns with `client_id` set.
 * Conversations/messages: mock until `GET /api/chat/conversations` is wired.
 *
 * Planned backend:
 * - `GET /api/chat/conversations?campaignId=…`
 * - `POST /api/chat/conversations/:leadId/send`
 * - Socket.io `new_message`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { fetchWithAuthRetry } from "@/lib/api/fetch-with-auth-retry";
import type { ChatMessage, ChatInboxCampaign, Conversation, ConversationTab } from "./types";
import { MOCK_CONVERSATIONS, MOCK_CURRENT_AGENT, MOCK_MESSAGES } from "./mockData";

type NewMessagePayload = { leadId: string; message: ChatMessage };

function createChatSocketStub() {
  const listeners = new Map<string, Set<(p: NewMessagePayload) => void>>();
  return {
    on(event: string, cb: (p: NewMessagePayload) => void): () => void {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => {
        listeners.get(event)?.delete(cb);
      };
    },
    emit(_event: string, _payload: NewMessagePayload) {
      // Mock server
    },
  };
}

function deepCloneConversations(list: Conversation[]): Conversation[] {
  return list.map((c) => ({ ...c }));
}

function deepCloneMessages(map: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  const out: Record<string, ChatMessage[]> = {};
  for (const k of Object.keys(map)) {
    out[k] = map[k].map((m) => ({ ...m }));
  }
  return out;
}

/** Associate demo threads with real campaign UUIDs so inbox filtering works. */
function attachCampaignsToConversations(
  convos: Conversation[],
  campaigns: ChatInboxCampaign[]
): Conversation[] {
  if (!campaigns.length) return convos;
  return convos.map((c, i) => {
    const camp = campaigns[i % campaigns.length];
    return {
      ...c,
      campaignUuid: camp.id,
      campaignName: camp.name,
    };
  });
}

export function useChat() {
  const authReady = useAuthReady();
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    deepCloneConversations(MOCK_CONVERSATIONS)
  );
  const [messagesByLead, setMessagesByLead] = useState<Record<string, ChatMessage[]>>(() =>
    deepCloneMessages(MOCK_MESSAGES)
  );
  const [activeLeadId, setActiveLeadId] = useState<string | null>(MOCK_CONVERSATIONS[0]?.leadId ?? null);
  const [tab, setTab] = useState<ConversationTab>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [leadInfoOpen, setLeadInfoOpen] = useState(false);
  const [chatCampaigns, setChatCampaigns] = useState<ChatInboxCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const socketRef = useRef(createChatSocketStub());

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      setCampaignsLoading(true);
      setCampaignsError(null);
      try {
        const res = await fetchWithAuthRetry("/api/chat/campaigns");
        const json = (await res.json()) as { campaigns?: ChatInboxCampaign[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load campaigns");
        const list = json.campaigns ?? [];
        if (cancelled) return;
        setChatCampaigns(list);
        const firstId = list[0]?.id ?? null;
        setSelectedCampaignId(firstId);
        setConversations((prev) => attachCampaignsToConversations(deepCloneConversations(prev), list));
      } catch (e) {
        if (!cancelled) {
          setCampaignsError(e instanceof Error ? e.message : "Failed to load campaigns");
          setChatCampaigns([]);
        }
      } finally {
        if (!cancelled) setCampaignsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  /** Collapse lead info on narrow viewports only. */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (mq.matches) setLeadInfoOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const unsub = socketRef.current.on("new_message", ({ leadId, message }) => {
      setMessagesByLead((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] ?? []), message],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.leadId === leadId
            ? {
                ...c,
                lastMessage: message.body,
                lastMessageAt: message.createdAt,
                unreadCount:
                  activeLeadId === leadId ? c.unreadCount : c.unreadCount + (message.direction === "inbound" ? 1 : 0),
              }
            : c
        )
      );
    });
    return unsub;
  }, [activeLeadId]);

  const selectCampaign = useCallback((campaignId: string | null) => {
    setSelectedCampaignId(campaignId);
  }, []);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (selectedCampaignId && c.campaignUuid !== selectedCampaignId) return false;
        if (tab === "mine" && c.assignedTo !== MOCK_CURRENT_AGENT) return false;
        if (tab === "unread" && c.unreadCount <= 0) return false;
        if (!q) return true;
        return (
          c.leadId.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [conversations, search, tab, selectedCampaignId]);

  useEffect(() => {
    if (!activeLeadId) return;
    if (filteredConversations.some((c) => c.leadId === activeLeadId)) return;
    setActiveLeadId(filteredConversations[0]?.leadId ?? null);
  }, [filteredConversations, activeLeadId]);

  const totalUnread = useMemo(() => conversations.reduce((s, c) => s + c.unreadCount, 0), [conversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.leadId === activeLeadId) ?? null,
    [conversations, activeLeadId]
  );

  const threadMessages = useMemo(
    () => (activeLeadId ? messagesByLead[activeLeadId] ?? [] : []),
    [activeLeadId, messagesByLead]
  );

  const selectConversation = useCallback((leadId: string) => {
    setActiveLeadId(leadId);
    setConversations((prev) =>
      prev.map((c) => (c.leadId === leadId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const sendMessage = useCallback(() => {
    const body = draft.trim();
    if (!body || !activeLeadId) return;
    const now = new Date().toISOString();
    const msg: ChatMessage = {
      id: `local-${now}`,
      direction: "outbound",
      body,
      createdAt: now,
      status: "sent",
    };
    setMessagesByLead((prev) => ({
      ...prev,
      [activeLeadId]: [...(prev[activeLeadId] ?? []), msg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.leadId === activeLeadId
          ? { ...c, lastMessage: body, lastMessageAt: now, unreadCount: 0 }
          : c
      )
    );
    setDraft("");
    setTimeout(() => {
      setMessagesByLead((prev) => ({
        ...prev,
        [activeLeadId]: (prev[activeLeadId] ?? []).map((m) =>
          m.id === msg.id ? { ...m, status: "read" as const } : m
        ),
      }));
    }, 400);
  }, [activeLeadId, draft]);

  const simulateInboundMessage = useCallback((leadId: string, body: string) => {
    const message: ChatMessage = {
      id: `sim-${Date.now()}`,
      direction: "inbound",
      body,
      createdAt: new Date().toISOString(),
    };
    setMessagesByLead((prev) => ({
      ...prev,
      [leadId]: [...(prev[leadId] ?? []), message],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.leadId === leadId
          ? {
              ...c,
              lastMessage: body,
              lastMessageAt: message.createdAt,
              unreadCount: activeLeadId === leadId ? 0 : c.unreadCount + 1,
            }
          : c
      )
    );
  }, [activeLeadId]);

  return {
    conversations,
    filteredConversations,
    totalUnread,
    tab,
    setTab,
    search,
    setSearch,
    activeLeadId,
    activeConversation,
    selectConversation,
    threadMessages,
    draft,
    setDraft,
    sendMessage,
    leadInfoOpen,
    setLeadInfoOpen,
    currentAgentName: MOCK_CURRENT_AGENT,
    simulateInboundMessage,
    chatCampaigns,
    campaignsLoading,
    campaignsError,
    selectedCampaignId,
    selectCampaign,
  };
}
