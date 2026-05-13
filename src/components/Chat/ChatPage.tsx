"use client";

import InboxPanel from "./InboxPanel";
import ChatThread from "./ChatThread";
import LeadInfoPanel from "./LeadInfoPanel";
import { useChat } from "./useChat";

export default function ChatPage() {
  const {
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
    chatCampaigns,
    campaignsLoading,
    campaignsError,
    selectedCampaignId,
    selectCampaign,
  } = useChat();

  return (
    <div
      className="crm-chat-root flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--border,#e4e7ec)] bg-[var(--bg,#ffffff)] shadow-sm"
      style={{
        margin: -24,
        width: "calc(100% + 48px)",
        height: "calc(100vh - 70px - 48px)",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <InboxPanel
          conversations={filteredConversations}
          activeLeadId={activeLeadId}
          onSelect={selectConversation}
          tab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          totalUnread={totalUnread}
          campaigns={chatCampaigns}
          campaignsLoading={campaignsLoading}
          campaignsError={campaignsError}
          selectedCampaignId={selectedCampaignId}
          onSelectCampaign={selectCampaign}
        />
        <ChatThread
          conversation={activeConversation}
          messages={threadMessages}
          draft={draft}
          onDraftChange={setDraft}
          onSend={sendMessage}
          leadInfoOpen={leadInfoOpen}
          onToggleLeadInfo={() => setLeadInfoOpen((v) => !v)}
        />
        <LeadInfoPanel
          conversation={activeConversation}
          open={leadInfoOpen}
          messageCount={threadMessages.length}
        />
      </div>
    </div>
  );
}
