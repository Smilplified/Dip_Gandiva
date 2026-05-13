"use client";

import { useState, type CSSProperties } from "react";
import {
  IconLock,
  IconMessage2,
  IconCalendar,
  IconUserPlus,
  IconAdjustments,
  IconBan,
} from "@tabler/icons-react";
import type { Conversation } from "./types";

interface LeadInfoPanelProps {
  conversation: Conversation | null;
  open: boolean;
  messageCount: number;
}

const STAGES = ["New", "Interested", "Qualified", "Nurture", "Disqualified"];

const LEAD_PANEL_SHELL =
  "crm-lead-info-panel flex h-full shrink-0 flex-col overflow-hidden border-l border-[#e4e7ec] bg-white";

function leadPanelStyle(open: boolean): CSSProperties {
  return {
    width: open ? 220 : 0,
    transition: "width 220ms ease",
  };
}

export default function LeadInfoPanel({ conversation, open, messageCount }: LeadInfoPanelProps) {
  const [stageModal, setStageModal] = useState(false);
  const [dqConfirm, setDqConfirm] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const lastMsg = conversation
    ? new Date(conversation.lastMessageAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const markDq = () => {
    setDqConfirm(false);
  };

  return (
    <>
      <aside
        className={LEAD_PANEL_SHELL}
        style={leadPanelStyle(open)}
        aria-hidden={!open}
      >
        <div className="flex w-[220px] min-w-[220px] flex-1 flex-col overflow-y-auto">
          {!conversation ? (
            <div className="p-4">
              <p className="m-0 text-[13px] text-[#98a2b3]">Select a lead</p>
            </div>
          ) : (
            <>
              <div className="border-b border-[#e4e7ec] p-4">
                <h3 className="m-0 text-[12px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                  Lead info
                </h3>
                <dl className="mt-3 space-y-2.5">
                  <div>
                    <dt className="text-[10px] font-medium uppercase text-[#98a2b3]">Lead ID</dt>
                    <dd className="m-0 text-[13px] font-semibold text-[#101828]">#{conversation.leadId}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase text-[#98a2b3]">Company</dt>
                    <dd className="m-0 text-[13px] text-[#344054]">{conversation.companyName}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase text-[#98a2b3]">Contact</dt>
                    <dd className="m-0 flex items-center gap-1 text-[13px] font-medium text-[#d92d20]">
                      <IconLock size={14} stroke={1.5} aria-hidden />
                      Hidden
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase text-[#98a2b3]">Stage</dt>
                    <dd className="m-0">
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-[#1d9e75]">
                        {conversation.stage}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase text-[#98a2b3]">Campaign</dt>
                    <dd className="m-0 text-[13px] text-[#344054]">{conversation.campaignName}</dd>
                  </div>
                </dl>
              </div>

              <div className="border-b border-[#e4e7ec] p-4">
                <h3 className="m-0 text-[12px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                  Activity
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2 text-[12px] text-[#344054]">
                    <IconMessage2 className="mt-0.5 shrink-0 text-[#1d9e75]" size={16} stroke={1.5} aria-hidden />
                    <span>
                      {messageCount} messages · last {lastMsg}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[12px] text-[#344054]">
                    <IconCalendar className="mt-0.5 shrink-0 text-[#1677ff]" size={16} stroke={1.5} aria-hidden />
                    <span>
                      First contact{" "}
                      {new Date(conversation.firstContactAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="m-0 text-[12px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                  Quick actions
                </h3>
                <button
                  type="button"
                  onClick={() => setReassignOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white py-2.5 text-[12px] font-medium text-[#344054] hover:bg-[#f7f8fa]"
                >
                  <IconUserPlus size={16} stroke={1.5} aria-hidden />
                  Reassign Lead
                </button>
                <button
                  type="button"
                  onClick={() => setStageModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white py-2.5 text-[12px] font-medium text-[#344054] hover:bg-[#f7f8fa]"
                >
                  <IconAdjustments size={16} stroke={1.5} aria-hidden />
                  Update Stage
                </button>
                <button
                  type="button"
                  onClick={() => setDqConfirm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#fda29b] bg-[#fef3f2] py-2.5 text-[12px] font-semibold text-[#d92d20] hover:bg-[#fee4e2]"
                >
                  <IconBan size={16} stroke={1.5} aria-hidden />
                  Mark DQ
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {reassignOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reassign-lead-title"
          onClick={() => setReassignOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reassign-lead-title" className="m-0 text-[15px] font-semibold text-[#101828]">
              Reassign lead
            </h3>
            <p className="mt-1 text-[13px] text-[#475467]">Choose an agent (mock).</p>
            <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#e4e7ec] divide-y divide-[#e4e7ec]">
              {["Shlok S", "Asha K", "Ravi P"].map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full border-0 bg-transparent px-3 py-2.5 text-left text-[13px] text-[#344054] hover:bg-[#f7f8fa]"
                    onClick={() => setReassignOpen(false)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-[#e4e7ec] bg-white py-2 text-[13px] font-medium text-[#475467]"
              onClick={() => setReassignOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {stageModal ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage-title"
          onClick={() => setStageModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="stage-title" className="m-0 text-[15px] font-semibold text-[#101828]">
              Update stage
            </h3>
            <div className="mt-3 grid gap-1">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-lg border border-[#e4e7ec] px-3 py-2 text-left text-[13px] text-[#344054] hover:border-[#1d9e75] hover:bg-emerald-50"
                  onClick={() => setStageModal(false)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-[#e4e7ec] py-2 text-[13px] font-medium text-[#475467]"
              onClick={() => setStageModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {dqConfirm ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDqConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="m-0 text-[14px] font-medium text-[#101828]">Mark lead as Disqualified?</p>
            <p className="mt-2 text-[13px] text-[#475467]">This action should be confirmed with your playbook.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-[#e4e7ec] py-2 text-[13px] font-medium text-[#475467]"
                onClick={() => setDqConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-[#d92d20] py-2 text-[13px] font-semibold text-white"
                onClick={markDq}
              >
                Confirm DQ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
