"use client";

import type { VoiceRecording } from "@/lib/voice-recordings";

/**
 * Coalesces per-cell recording lookups into one POST /api/leads/voice-recordings
 * call. Every table cell that mounts within the window joins the same batch, so
 * a page of N leads costs 1 request instead of N.
 */
const BATCH_WINDOW_MS = 50;
const MAX_BATCH_LEADS = 100;

type Waiter = {
  resolve: (recordings: VoiceRecording[]) => void;
  reject: (err: unknown) => void;
};

let pendingWaiters = new Map<string, Waiter[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushBatch() {
  flushTimer = null;
  const waiters = pendingWaiters;
  pendingWaiters = new Map();

  const leadIds = [...waiters.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < leadIds.length; i += MAX_BATCH_LEADS) {
    chunks.push(leadIds.slice(i, i + MAX_BATCH_LEADS));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch("/api/leads/voice-recordings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds: chunk }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          recordings?: Record<string, VoiceRecording[]>;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load recordings");
        }
        for (const id of chunk) {
          for (const w of waiters.get(id) ?? []) {
            w.resolve(json.recordings?.[id] ?? []);
          }
        }
      } catch (err) {
        for (const id of chunk) {
          for (const w of waiters.get(id) ?? []) {
            w.reject(err);
          }
        }
      }
    })
  );
}

export function fetchLeadRecordingsBatched(leadId: string): Promise<VoiceRecording[]> {
  return new Promise<VoiceRecording[]>((resolve, reject) => {
    const existing = pendingWaiters.get(leadId);
    if (existing) {
      existing.push({ resolve, reject });
    } else {
      pendingWaiters.set(leadId, [{ resolve, reject }]);
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => void flushBatch(), BATCH_WINDOW_MS);
    }
  });
}
