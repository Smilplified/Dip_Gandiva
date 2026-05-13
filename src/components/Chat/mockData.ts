import type { ChatMessage, Conversation } from "./types";

export const MOCK_CURRENT_AGENT = "Shlok S";

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    leadId: "L-2047",
    companyName: "Mumbai Corp",
    initials: "MB",
    lastMessage: "Interested in enterprise plan...",
    lastMessageAt: "2026-05-13T10:32:00.000Z",
    unreadCount: 0,
    assignedTo: "Shlok S",
    campaignName: "B2BinDemand",
    stage: "Interested",
    avatarHue: 0,
    firstContactAt: "2026-05-01T09:00:00.000Z",
    showTyping: true,
  },
  {
    leadId: "L-1983",
    companyName: "Delhi Tech",
    initials: "DT",
    lastMessage: "Haan, this week possible hai?",
    lastMessageAt: "2026-05-13T10:34:00.000Z",
    unreadCount: 2,
    assignedTo: "Shlok S",
    campaignName: "B2BinDemand",
    stage: "Qualified",
    avatarHue: 1,
    firstContactAt: "2026-04-20T14:30:00.000Z",
  },
  {
    leadId: "L-1821",
    companyName: "Pune Logistics",
    initials: "PL",
    lastMessage: "Please send the deck again.",
    lastMessageAt: "2026-05-12T16:10:00.000Z",
    unreadCount: 0,
    assignedTo: "Asha K",
    campaignName: "Q2 Outreach",
    stage: "New",
    avatarHue: 2,
    firstContactAt: "2026-05-10T11:00:00.000Z",
  },
  {
    leadId: "L-1654",
    companyName: "Chennai Retail",
    initials: "CR",
    lastMessage: "Noted, thanks!",
    lastMessageAt: "2026-05-11T08:45:00.000Z",
    unreadCount: 0,
    assignedTo: "Shlok S",
    campaignName: "Retail Wave",
    stage: "Nurture",
    avatarHue: 3,
    firstContactAt: "2026-03-15T10:00:00.000Z",
  },
];

const t13 = "2026-05-13T";

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  "L-2047": [
    {
      id: "m1",
      direction: "inbound",
      body: "Hello, mujhe enterprise plan ke baare mein jaanna tha...",
      createdAt: `${t13}09:15:00.000Z`,
    },
    {
      id: "m2",
      direction: "outbound",
      body: "Hi! Bilkul, 50+ team ke liye enterprise plan best fit hoga. Main aapko features walkthrough kara deta hoon.",
      createdAt: `${t13}09:18:00.000Z`,
      status: "read",
    },
    {
      id: "m3",
      direction: "inbound",
      body: "Pricing sheet share kar sakte ho?",
      createdAt: `${t13}10:28:00.000Z`,
    },
    {
      id: "m4",
      direction: "outbound",
      body: "Haan, abhi PDF bhej raha hoon. Koi specific compliance requirement hai?",
      createdAt: `${t13}10:32:00.000Z`,
      status: "read",
    },
  ],
  "L-1983": [
    {
      id: "n1",
      direction: "inbound",
      body: "Demo kab possible hai?",
      createdAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "n2",
      direction: "outbound",
      body: "This week Thursday 3pm IST slot hai — works?",
      createdAt: "2026-05-13T08:05:00.000Z",
      status: "delivered",
    },
    {
      id: "n3",
      direction: "inbound",
      body: "Haan, this week possible hai?",
      createdAt: "2026-05-13T10:34:00.000Z",
    },
  ],
  "L-1821": [
    {
      id: "p1",
      direction: "outbound",
      body: "Sharing the updated deck link.",
      createdAt: "2026-05-12T15:00:00.000Z",
      status: "read",
    },
    {
      id: "p2",
      direction: "inbound",
      body: "Please send the deck again.",
      createdAt: "2026-05-12T16:10:00.000Z",
    },
  ],
  "L-1654": [
    {
      id: "c1",
      direction: "inbound",
      body: "We will revert next month.",
      createdAt: "2026-05-11T08:40:00.000Z",
    },
    {
      id: "c2",
      direction: "outbound",
      body: "Sounds good — pinging you mid next month.",
      createdAt: "2026-05-11T08:42:00.000Z",
      status: "read",
    },
    {
      id: "c3",
      direction: "inbound",
      body: "Noted, thanks!",
      createdAt: "2026-05-11T08:45:00.000Z",
    },
  ],
};
