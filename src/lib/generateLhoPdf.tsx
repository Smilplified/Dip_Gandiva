"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { formatFullAddress } from "@/lib/lho/meeting-report-format";

const BRAND_GREEN = "#2D5A4C";
const SECTION_BAR_BG = "#F9E8D4";
const DEFAULT_LOGO_SRC = "/projects/B2Bindemand_logo.png";

const LOGO_WIDTH = 148;

/** Reserved top space: fixed header (logo + title) must stay above body content. */
const PAGE_HEADER_RESERVE = 132;

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    paddingTop: PAGE_HEADER_RESERVE,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#1a1a1a",
  },
  pageHeader: {
    position: "absolute",
    top: 20,
    left: 48,
    right: 48,
    alignItems: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  logoBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    paddingBottom: 10,
  },
  logoImage: {
    width: LOGO_WIDTH,
    height: 55,
    objectFit: "contain",
  },
  reportTitle: {
    marginTop: 0,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: BRAND_GREEN,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 1.35,
    paddingBottom: 4,
  },
  body: {
    marginTop: 16,
  },
  metaBlock: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 7,
    alignItems: "flex-start",
  },
  label: {
    width: 132,
    fontSize: 11,
    color: BRAND_GREEN,
    fontFamily: "Helvetica-Bold",
  },
  colon: {
    width: 8,
    fontSize: 11,
    color: BRAND_GREEN,
    fontFamily: "Helvetica-Bold",
  },
  value: {
    flex: 1,
    fontSize: 11,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.35,
  },
  cqBlock: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  cqQuestion: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_GREEN,
    marginBottom: 4,
    lineHeight: 1.35,
  },
  cqAnswer: {
    fontSize: 11,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  sectionBar: {
    backgroundColor: SECTION_BAR_BG,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionBarText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND_GREEN,
    letterSpacing: 0.6,
  },
  content: {
    marginBottom: 32,
  },
});

export type LhoData = {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  directNumber: string;
  jobTitle: string;
  jobLevel: string;
  department: string;
  jobFunction: string;
  jobTitleLink: string;
  contactLinkedIn: string;
  companyName: string;
  domain: string;
  companyNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  employeeSize: string;
  seeAllEmployees: string;
  industry: string;
  employeeSizeLink: string;
  companyWebsite: string;
  companyLinkedIn: string;
  revenueRange: string;
  revenueLink: string;
  sicCode: string;
  sicCodeLink: string;
  naicsCode: string;
  naicsCodeLink: string;
  foundedYears: string;
  foundedYearsLink: string;
  callBack: string;
  callNotes: string;
  cq1: string;
  cq2: string;
  cq3: string;
  cq4: string;
  cq5: string;
  extraCq: Record<string, string>;
  campaignQuestions: { label: string; answer: string }[];
  leadStatus: string;
  leadTagging: string;
  assetTitle: string;
  status: string;
  qaStatus: string;
  auditDate: string;
  qaName: string;
  tenurity: string;
  vvStatus: string;
  emailStatus: string;
  evTool: string;
  primaryReason: string;
  secondaryReason: string;
  qaComments: string;
  scoredAt?: string | null;
  scoredTimezone?: string | null;
  appointmentAt?: string | null;
  appointmentTimezone?: string | null;
  scored: string;
  appointment: string;
  client?: string;
  preparedBy?: string;
  agentName?: string;
  meetingSetDate?: string;
  meetingDate?: string;
  meetingTime?: string;
  raComment: string;
  specialComments: string;
  notes: string;
};

function FieldRow({ label, value }: { label: string; value: string | undefined | null }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.colon}>:</Text>
      <Text style={styles.value}>{v}</Text>
    </View>
  );
}

function SectionBar({ title }: { title: string }) {
  return (
    <View style={styles.sectionBar} wrap={false}>
      <Text style={styles.sectionBarText}>{title}</Text>
    </View>
  );
}

function CampaignQuestionsSection({
  rows,
}: {
  rows: { label: string; answer: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <SectionBar title="CAMPAIGN QUESTIONS" />
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={
            index === rows.length - 1
              ? { ...styles.cqBlock, borderBottomWidth: 0, marginBottom: 0 }
              : styles.cqBlock
          }
        >
          <Text style={styles.cqQuestion}>{row.label}</Text>
          <Text style={styles.cqAnswer}>{row.answer}</Text>
        </View>
      ))}
    </>
  );
}

function PageHeader({ logoSrc }: { logoSrc?: string | null }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View style={styles.logoWrap}>
        <View style={styles.logoBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image (not HTML img) */}
          <Image style={styles.logoImage} src={logoSrc || DEFAULT_LOGO_SRC} />
        </View>
      </View>
      <Text style={styles.reportTitle}>Meeting Report</Text>
    </View>
  );
}

function LhoDocument({
  data,
  logoSrc,
  showClientName = false,
}: {
  data: LhoData;
  logoSrc?: string | null;
  showClientName?: boolean;
}) {
  const prospectName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  const phone = data.phone || data.directNumber;
  const fullAddress = formatFullAddress({
    address: data.address,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    country: data.country,
  });
  const website = data.companyWebsite || data.domain;

  return (
    <Document title="Meeting Report">
      <Page size="A4" style={styles.page} wrap>
        <PageHeader logoSrc={logoSrc} />

        <View style={styles.body}>
          <View style={styles.content}>
          <View style={styles.metaBlock}>
            {showClientName && <FieldRow label="Client" value={data.client} />}
            {showClientName && <FieldRow label="Prepared by" value={data.preparedBy} />}
            <FieldRow label="Date Meeting Set" value={data.meetingSetDate} />
            <FieldRow label="Meeting Date" value={data.meetingDate} />
            <FieldRow label="Meeting Time" value={data.meetingTime} />
            <FieldRow label="Agent Name" value={data.agentName} />
          </View>

          <SectionBar title="PROSPECT INFORMATION" />
          <FieldRow label="Name" value={prospectName} />
          <FieldRow label="Title" value={data.jobTitle} />
          <FieldRow label="Email" value={data.email} />
          <FieldRow label="Phone" value={phone} />
          <FieldRow label="LinkedIn" value={data.contactLinkedIn} />

          <SectionBar title="COMPANY INFORMATION" />
          <FieldRow label="Account" value={data.companyName} />
          <FieldRow label="Industry" value={data.industry} />
          <FieldRow label="Employee Size" value={data.employeeSize} />
          <FieldRow label="Address" value={fullAddress} />
          <FieldRow label="Website" value={website} />

          <CampaignQuestionsSection rows={data.campaignQuestions} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateLhoPdf(
  data: LhoData,
  options?: { logoSrc?: string | null; showClientName?: boolean }
): Promise<void> {
  const doc = (
    <LhoDocument
      data={data}
      logoSrc={options?.logoSrc ?? null}
      showClientName={options?.showClientName ?? false}
    />
  );
  const blob = await pdf(doc).toBlob();

  const companySlug = (data.companyName || "Company").replace(/\s+/g, "_");
  const prospectSlug =
    [data.firstName, data.lastName].filter(Boolean).join("_") || "Prospect";
  const fileName = `Meeting_Report_${companySlug}_${prospectSlug}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
