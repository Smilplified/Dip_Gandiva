"use client";

import { IconSearch } from "@tabler/icons-react";
import type { ChatInboxCampaign, Conversation, ConversationTab } from "./types";
import ConversationItem from "./ConversationItem";

interface InboxPanelProps {
  conversations: Conversation[];
  activeLeadId: string | null;
  onSelect: (leadId: string) => void;
  tab: ConversationTab;
  onTabChange: (t: ConversationTab) => void;
  search: string;
  onSearchChange: (v: string) => void;
  totalUnread: number;
  campaigns: ChatInboxCampaign[];
  campaignsLoading: boolean;
  campaignsError: string | null;
  selectedCampaignId: string | null;
  onSelectCampaign: (campaignId: string | null) => void;
}

const TABS: { id: ConversationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "unread", label: "Unread" },
];

export default function InboxPanel({
  conversations,
  activeLeadId,
  onSelect,
  tab,
  onTabChange,
  search,
  onSearchChange,
  totalUnread,
  campaigns,
  campaignsLoading,
  campaignsError,
  selectedCampaignId,
  onSelectCampaign,
}: InboxPanelProps) {
  return (
    <div className="flex h-full w-[268px] shrink-0 flex-col border-r border-[#e4e7ec] bg-white">
      <div className="shrink-0 border-b border-[#e4e7ec] px-3 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="m-0 text-[15px] font-semibold text-[#101828]">Inbox</h2>
          {totalUnread > 0 ? (
            <span className="rounded-full bg-[#fef3f2] px-2 py-0.5 text-[11px] font-medium text-[#d92d20]">
              {totalUnread} new
            </span>
          ) : null}
        </div>

        <p className="m-0 mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#98a2b3]">
          Active campaigns · client assigned
        </p>
        {campaignsError ? (
          <p className="mb-2 rounded-lg bg-[#fef3f2] px-2 py-1.5 text-[11px] text-[#b42318]">{campaignsError}</p>
        ) : null}
        {campaignsLoading ? (
          <div className="mb-3 max-h-[120px] space-y-2 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-[#f2f4f7]" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="mb-3 text-[12px] leading-snug text-[#98a2b3]">
            No active campaigns with an assigned client for your account.
          </p>
        ) : (
          <div className="mb-3 max-h-[140px] space-y-1.5 overflow-y-auto rounded-lg border border-[#eef1f5] bg-[#fafbfb] p-1.5">
            {campaigns.map((c) => {
              const sel = c.id === selectedCampaignId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCampaign(c.id)}
                  className={[
                    "flex w-full flex-col rounded-md border px-2.5 py-2 text-left transition-colors",
                    sel
                      ? "border-[#1d9e75] bg-[#ecfdf5] shadow-sm"
                      : "border-transparent bg-white hover:border-[#e4e7ec] hover:bg-[#f7f8fa]",
                  ].join(" ")}
                >
                  <span className="truncate text-[12px] font-semibold text-[#101828]">{c.name}</span>
                  <span className="truncate text-[10px] text-[#475467]">
                    {c.clientName?.trim() ? c.clientName : "Client"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]"
            size={16}
            stroke={1.5}
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-[#e4e7ec] bg-[#f7f8fa] py-2 pl-9 pr-3 text-[13px] text-[#101828] outline-none placeholder:text-[#98a2b3] focus:border-[#1d9e75] focus:ring-1 focus:ring-[#1d9e75]"
          />
        </div>
        <div className="mt-3 flex border-b border-[#e4e7ec]">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={[
                  "flex-1 border-0 bg-transparent pb-2.5 text-[13px] transition-colors",
                  on ? "border-b-2 border-[#1d9e75] font-medium text-[#1d9e75]" : "border-b-2 border-transparent font-normal text-[#475467]",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="crm-inbox-scroll flex min-h-0 flex-1 flex-col">
        {conversations.length === 0 ? (
          <p className="min-h-full border-b border-[#eef1f5] px-3 py-6 text-center text-[13px] text-[#98a2b3]">
            No conversations match.
          </p>
        ) : (
          <div className="flex min-h-full flex-1 flex-col divide-y divide-[#eef1f5] border-b border-[#eef1f5]">
            {conversations.map((c) => (
              <ConversationItem
                key={c.leadId}
                conversation={c}
                active={c.leadId === activeLeadId}
                onSelect={() => onSelect(c.leadId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
