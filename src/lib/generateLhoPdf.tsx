"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0f1720",
    fontFamily: "Helvetica",
    padding: 0,
  },
  container: {
    margin: 24,
    backgroundColor: "#1b2530",
    borderRadius: 8,
    padding: "44 48 52",
    color: "#d1d5db",
    position: "relative",
    flexGrow: 1,
  },
  circle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#3b2a1f",
    top: -80,
    left: -80,
    opacity: 0.6,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 30,
    color: "#0ea5e9",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  logoI: {
    fontSize: 30,
    color: "#facc15",
    fontFamily: "Helvetica-Bold",
  },
  yellowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#facc15",
    marginBottom: -10,
    alignSelf: "center",
  },
  subTitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#cbd5e1",
    fontFamily: "Helvetica",
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 14,
    color: "#e5e7eb",
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3f52",
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 10,
  },
  label: {
    width: 155,
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: "Helvetica-Bold",
  },
  colon: {
    width: 12,
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: "Helvetica-Bold",
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: "#e2e8f0",
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#2d3f52",
    marginVertical: 18,
  },
  // Notes page
  notesHeading: {
    fontSize: 14,
    color: "#e5e7eb",
    fontFamily: "Helvetica-Bold",
    marginBottom: 18,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3f52",
    paddingBottom: 6,
  },
  notePoint: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  noteBullet: {
    width: 16,
    fontSize: 10,
    color: "#0ea5e9",
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 10,
    color: "#e2e8f0",
    fontFamily: "Helvetica",
    lineHeight: 1.6,
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

/** Render a row with value or 'N/A' when missing */
function FieldRow({ label, value }: { label: string | undefined; value: string | undefined | null }) {
  const v = value == null || String(value).trim() === "" ? "N/A" : String(value).trim();
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

function Logo() {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>B2B</Text>
        <View style={{ flexDirection: "column", alignItems: "center" }}>
          <View style={styles.yellowDot} />
          <Text style={styles.logoI}>i</Text>
        </View>
        <Text style={styles.logoText}>nDemand</Text>
      </View>
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

  const fullAddress = [data.address, data.city, data.state, data.country, data.zipCode]
    .filter(Boolean)
    .join(", ");

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
  
  // Add dynamic CQ fields (CQ6, CQ7, etc.) from extra_cq
  if (data.extraCq && typeof data.extraCq === "object") {
    Object.entries(data.extraCq)
      .sort(([keyA], [keyB]) => {
        const numA = parseInt(keyA.replace(/\D/g, "")) || 0;
        const numB = parseInt(keyB.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .forEach(([key, value]) => {
        const label = key.toUpperCase();
        cqFields.push({ label, value: String(value ?? "") });
      });
  }
  
  cqFields = cqFields.filter((f) => f.value?.trim());

  return (
    <Document title="Lead Handover Document">

      {/* ── Page 1: Company + Prospect + Custom Questions ── */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.container}>
          <View style={styles.circle} />
          <Logo />

          {/* Company Details */}
          <Text style={styles.sectionHeading}>Company Details</Text>
          <FieldRow label="Company Name" value={data.companyName} />
          <FieldRow label="Domain" value={data.domain} />
          <FieldRow label="Corporate Number / Board Dial" value={data.companyNumber} />
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

          {/* Prospect Details */}
          <Text style={styles.sectionHeading}>Prospect Details</Text>
          <FieldRow label="Salutation" value={data.salutation} />
          <FieldRow label="First Name" value={data.firstName} />
          <FieldRow label="Last Name" value={data.lastName} />
          <FieldRow label="Full Name" value={prospectName} />
          <FieldRow label="Email Address" value={data.email} />
          <FieldRow label="Phone Number" value={data.phone} />
          <FieldRow label="Direct Number" value={data.directNumber} />
          <FieldRow label="Job Title" value={data.jobTitle} />
          <FieldRow label="Job Title Level" value={data.jobLevel} />
          <FieldRow label="Department" value={data.department} />
          <FieldRow label="Job Function" value={data.jobFunction} />
          <FieldRow label="Job Title Link" value={data.jobTitleLink} />

          {/* Custom Questions — only if any filled */}
          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>Custom Questions & Lead Status</Text>
          <FieldRow label="Lead Status" value={data.leadStatus} />
          <FieldRow label="Call Notes" value={data.callNotes} />
          {cqFields.map((f) => (
            <FieldRow key={f.label} label={f.label} value={f.value} />
          ))}
          <FieldRow label="Lead Tagging" value={data.leadTagging} />
          <FieldRow label="RA Comment" value={data.raComment} />
          <FieldRow label="Special Comments" value={data.specialComments} />

          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>QA Audit & Status</Text>
          <FieldRow label="Asset Title" value={data.assetTitle} />
          <FieldRow label="Status" value={data.status || data.qaStatus} />
          <FieldRow label="QA Status" value={data.qaStatus} />
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
          <Text style={styles.sectionHeading}>Scheduling Information</Text>
          <FieldRow label="Scored" value={data.scored} />
          <FieldRow label="Appointment" value={data.appointment} />

          <View style={styles.divider} />
          {/* <Text style={styles.sectionHeading}>Voice Log</Text> */}
          {/* <FieldRow label="Voice Log URL / Reference" value={data.voiceLog} /> */}

          {/* Notes Section (same page, continues) */}
          {hasNotes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeading}>Notes</Text>
              {notePoints.map((point, i) => (
                <View key={i} style={styles.notePoint}>
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