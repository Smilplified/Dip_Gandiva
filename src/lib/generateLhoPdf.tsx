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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
  backgroundColor: "#ffffff",
  fontFamily: "Helvetica",
  paddingTop: 26,
  paddingBottom: 18,
},
  container: {
    margin: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: "28 32 36",
    color: "#1a1a1a",
    position: "relative",
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 200,
    height: 52,
    objectFit: "contain",
    alignSelf: "center",
    marginBottom: 6,
  },
  subTitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#374151",
    fontFamily: "Helvetica",
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 11,
    color: "#111827",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 148,
    fontSize: 9,
    color: "#374151",
    fontFamily: "Helvetica-Bold",
  },
  colon: {
    width: 10,
    fontSize: 9,
    color: "#374151",
    fontFamily: "Helvetica-Bold",
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },
  notePoint: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  noteBullet: {
    width: 14,
    fontSize: 9,
    color: "#0ea5e9",
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  // Section wrapper — keeps heading + first rows together across page breaks
  section: {
    marginBottom: 2,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type LhoData = {
  // Prospect / Contact
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
  // Company
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
  // Custom / CQ
  callBack: string;
  callNotes: string;
  cq1: string;
  cq2: string;
  cq3: string;
  cq4: string;
  cq5: string;
  extraCq: Record<string, string>; // For CQ6, CQ7, etc.
  // Lead status / tagging
  leadStatus: string;
  leadTagging: string;
  // QA / Audit fields
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
  // Scheduling
  scored: string;
  appointment: string;
  // Voice log (url or reference)
  // voiceLog: string;
  raComment: string;
  specialComments: string;
  // Notes (raw text — parsed into numbered points)
  notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Render a row only when value is non-empty */
function FieldRow({ label, value }: { label: string | undefined; value: string | undefined | null }) {
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

/**
 * Parse notes into bullet points.
 * - Numbered prefixes (1. 1)) are stripped, each becomes a bullet
 * - Double space = new bullet on next line
 * - Single newline = new bullet
 */
function parseNotes(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  return raw
    .replace(/(\d+[.)]) */g, "\n")   // strip numbered prefixes, insert newline
    .replace(/  +/g, "\n")            // double space → newline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// ── Logo component ────────────────────────────────────────────────────────────

// Default B2Bindemand logo from public assets
const LOGO_BASE64 = "/projects/B2Bindemand_logo.png";

function Logo({ logoSrc }: { logoSrc?: string | null }) {
  return (
    <View style={styles.header} wrap={false}>
      <Image style={styles.logoImage} src={logoSrc || LOGO_BASE64} />
      <Text style={styles.subTitle}>Lead Handover Document</Text>
    </View>
  );
}

// ── Main Document ─────────────────────────────────────────────────────────────

function LhoDocument({ data, logoSrc }: { data: LhoData; logoSrc?: string | null }) {
  const prospectName = [data.salutation, data.firstName, data.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const notePoints = parseNotes(data.notes);
  const hasNotes = notePoints.length > 0;

  // Collect CQ fields that are filled (CQ1-CQ5 + dynamic CQ6+)
  let cqFields: { label: string; value: string }[] = [
    { label: "CQ1", value: data.cq1 },
    { label: "CQ2", value: data.cq2 },
    { label: "CQ3", value: data.cq3 },
    { label: "CQ4", value: data.cq4 },
    { label: "CQ5", value: data.cq5 },
  ];

  if (data.extraCq && typeof data.extraCq === "object") {
    Object.entries(data.extraCq)
      .sort(([keyA], [keyB]) => {
        const numA = parseInt(keyA.replace(/\D/g, "")) || 0;
        const numB = parseInt(keyB.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .forEach(([key, value]) => {
        cqFields.push({ label: key.toUpperCase(), value: String(value ?? "") });
      });
  }

  cqFields = cqFields.filter((f) => f.value?.trim());

  return (
    <Document title="Lead Handover Document">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.container}>

          {/* Header — never split */}
          <Logo logoSrc={logoSrc} />

          {/* ── Company Details ──
              wrap={false} on the anchor block keeps heading + first 3 rows together.
              Remaining rows are allowed to flow naturally. */}
          <View wrap={false} style={styles.section}>
            <Text style={styles.sectionHeading}>Company Details</Text>
            <FieldRow label="Company Name" value={data.companyName} />
            <FieldRow label="Domain" value={data.domain} />
            <FieldRow label="Corporate Number / Board Dial" value={data.companyNumber} />
          </View>
          <FieldRow label="Company Website Link" value={data.companyWebsite} />
          <FieldRow label="Address Line 1" value={data.address} />
          <FieldRow label="City" value={data.city} />
          <FieldRow label="State" value={data.state} />
          <FieldRow label="Country" value={data.country} />
          <FieldRow label="Zip / Postal Code" value={data.zipCode} />
          <FieldRow label="Employee Size" value={data.employeeSize} />
          <FieldRow label="See All Employees" value={data.seeAllEmployees} />
          <FieldRow label="Employee Size Link" value={data.employeeSizeLink} />
          <FieldRow label="Industry Type" value={data.industry} />
          <FieldRow label="Revenue Size / Revenue Range" value={data.revenueRange} />
          <FieldRow label="Revenue Link" value={data.revenueLink} />
          <FieldRow label="Founded Year" value={data.foundedYears} />
          <FieldRow label="Founded Year Link" value={data.foundedYearsLink} />
          <FieldRow label="SIC Code" value={data.sicCode} />
          <FieldRow label="SIC Code Link" value={data.sicCodeLink} />
          <FieldRow label="NAICS Code" value={data.naicsCode} />
          <FieldRow label="NAICS Code Link" value={data.naicsCodeLink} />
          <FieldRow label="Company LinkedIn URL" value={data.companyLinkedIn} />

          <View style={styles.divider} />

          {/* ── Prospect Details ── */}
          <View wrap={false} style={styles.section}>
            <Text style={styles.sectionHeading}>Prospect Details</Text>
            <FieldRow label="Salutation" value={data.salutation} />
            <FieldRow label="First Name" value={data.firstName} />
            <FieldRow label="Last Name" value={data.lastName} />
          </View>
          <FieldRow label="Full Name" value={prospectName} />
          <FieldRow label="Email Address" value={data.email} />
          <FieldRow label="Phone Number" value={data.phone} />
          <FieldRow label="Direct Number" value={data.directNumber} />
          <FieldRow label="Job Title" value={data.jobTitle} />
          <FieldRow label="Job Title Level" value={data.jobLevel} />
          <FieldRow label="Department" value={data.department} />
          <FieldRow label="Job Function" value={data.jobFunction} />
          <FieldRow label="Job Title Link" value={data.jobTitleLink} />

          <View style={styles.divider} />

          {/* ── Custom Questions & Lead Status ── */}
          <View wrap={false} style={styles.section}>
            <Text style={styles.sectionHeading}>Custom Questions &amp; Lead Status</Text>
            <FieldRow label="Lead Status" value={data.leadStatus} />
            <FieldRow label="Call Notes" value={data.callNotes} />
          </View>
          {cqFields.map((f) => (
            <FieldRow key={f.label} label={f.label} value={f.value} />
          ))}
          <FieldRow label="Lead Tagging" value={data.leadTagging} />
          <FieldRow label="RA Comment" value={data.raComment} />
          <FieldRow label="Special Comments" value={data.specialComments} />

          <View style={styles.divider} />

          {/* ── QA Audit & Status ── */}
          <View wrap={false} style={styles.section}>
            <Text style={styles.sectionHeading}>QA Audit &amp; Status</Text>
            <FieldRow label="Asset Title" value={data.assetTitle} />
            <FieldRow label="Status" value={data.status || data.qaStatus} />
            <FieldRow label="QA Status" value={data.qaStatus} />
          </View>
          <FieldRow label="Audit Date" value={data.auditDate} />
          <FieldRow label="QA Name" value={data.qaName} />
          <FieldRow label="Tenurity" value={data.tenurity} />
          <FieldRow label="VV Status" value={data.vvStatus} />
          <FieldRow label="Email Status" value={data.emailStatus} />
          <FieldRow label="EV Tool" value={data.evTool} />
          <FieldRow label="Primary Reason" value={data.primaryReason} />
          <FieldRow label="Secondary Reason" value={data.secondaryReason} />
          <FieldRow label="QA Comments" value={data.qaComments} />

          <View style={styles.divider} />

          {/* ── Scheduling ── */}
          <View wrap={false} style={styles.section}>
            <Text style={styles.sectionHeading}>Scheduling Information</Text>
            <FieldRow label="Scored" value={data.scored} />
            <FieldRow label="Appointment" value={data.appointment} />
          </View>

          {/* ── Notes ── */}
          {hasNotes && (
            <>
              <View style={styles.divider} />
              <View wrap={false} style={styles.section}>
                <Text style={styles.sectionHeading}>Notes</Text>
                {notePoints.slice(0, 3).map((point, i) => (
                  <View key={i} style={styles.notePoint}>
                    <Text style={styles.noteBullet}>•</Text>
                    <Text style={styles.noteText}>{point}</Text>
                  </View>
                ))}
              </View>
              {notePoints.slice(3).map((point, i) => (
                <View key={i + 3} style={styles.notePoint}>
                  <Text style={styles.noteBullet}>•</Text>
                  <Text style={styles.noteText}>{point}</Text>
                </View>
              ))}
            </>
          )}

        </View>
      </Page>
    </Document>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function generateLhoPdf(
  data: LhoData,
  options?: { logoSrc?: string | null }
): Promise<void> {
  const doc = <LhoDocument data={data} logoSrc={options?.logoSrc ?? null} />;
  const blob = await pdf(doc).toBlob();

  const companySlug = (data.companyName || "Company").replace(/\s+/g, "_");
  const prospectSlug = [data.firstName, data.lastName].filter(Boolean).join("_") || "Prospect";
  const fileName = `LHO_${companySlug}_${prospectSlug}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}