/** Deterministic avatar backgrounds — no PII; company initials only in UI. */
const AVATAR_BGS = [
  "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
  "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
];

export function avatarBackground(hue: number): string {
  return AVATAR_BGS[Math.abs(hue) % AVATAR_BGS.length];
}
