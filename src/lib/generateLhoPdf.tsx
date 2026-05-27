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

// Base64 logo string — keep as-is from original
const LOGO_BASE64 = "data:image/png;base64,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";

function Logo() {
  return (
    <View style={styles.header} wrap={false}>
      <Image style={styles.logoImage} src={LOGO_BASE64} />
      <Text style={styles.subTitle}>Lead Handover Document</Text>
    </View>
  );
}

// ── Main Document ─────────────────────────────────────────────────────────────

function LhoDocument({ data }: { data: LhoData }) {
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
          <Logo />

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

export async function generateLhoPdf(data: LhoData): Promise<void> {
  const doc = <LhoDocument data={data} />;
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