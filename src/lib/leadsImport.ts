/**
 * Parse CSV file and return array of lead objects for bulk import.
 * Maps common column headers (case-insensitive) to lead fields.
 */

const HEADER_MAP: Record<string, string> = {
  "lead id": "lead_id",
  "first name": "first_name",
  "firstname": "first_name",
  "last name": "last_name",
  "lastname": "last_name",
  name: "name",
  company: "company_name",
  "company name": "company_name",
  "company_name": "company_name",
  email: "email",
  phone: "phone",
  "job title": "job_title",
  "jobtitle": "job_title",
  "job_title": "job_title",
  industry: "industry",
  city: "city",
  state: "state",
  country: "country",
  address: "address",
  "zip code": "zip_code",
  "zip_code": "zip_code",
  status: "status",
  "qa status": "qa_status",
  "qa_status": "qa_status",
  notes: "notes",
  domain: "domain",
  "direct number": "direct_number",
  "company number": "company_number",
  department: "department",
  "job function": "job_function",
  "job level": "job_level",
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        current += c;
      }
    } else if (c === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseLeadsCsv(csvText: string): Record<string, unknown>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const colMap = headers.map((h) => HEADER_MAP[h] ?? h.replace(/\s+/g, "_"));

  const leads: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    for (let j = 0; j < colMap.length && j < values.length; j++) {
      const key = colMap[j];
      const val = values[j]?.trim();
      if (key && val) {
        row[key] = val;
      }
    }
    if (Object.keys(row).length > 0) {
      if (!row.name && (row.first_name || row.last_name)) {
        row.name = [row.first_name, row.last_name].filter(Boolean).join(" ");
      }
      leads.push(row);
    }
  }
  return leads;
}
