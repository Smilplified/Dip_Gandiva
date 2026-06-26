import { normalizeRoleName } from "@/lib/auth/config";
import {
  hasOperationsManagerAccess,
  hasSalesManagerAccess,
} from "@/lib/auth/tl-access";
import { hasCommandRole, hasAdminOverrideRole } from "@/lib/command/rules-engine";

/** Roles that can view and participate in the campaign feed tab. */
export const CAMPAIGN_FEED_ROLES = [
  "operations_manager",
  "sales_manager",
  "client_viewer",
] as const;

export function hasCampaignFeedRole(roleNames: string[]): boolean {
  const normalized = roleNames.map((r) => normalizeRoleName(r));
  if (hasAdminOverrideRole(roleNames) || hasCommandRole(roleNames)) return true;
  if (hasOperationsManagerAccess(roleNames)) return true;
  if (hasSalesManagerAccess(roleNames)) return true;
  return normalized.includes("client_viewer");
}

export function canDeleteAnyFeedPost(roleNames: string[]): boolean {
  return hasAdminOverrideRole(roleNames);
}

export function getRoleDisplayLabel(roleNames: string[]): string {
  if (hasAdminOverrideRole(roleNames)) return "Admin";
  if (roleNames.some((r) => normalizeRoleName(r) === "internal_operator")) {
    return "Internal Operator";
  }
  if (hasOperationsManagerAccess(roleNames)) return "Operations Manager";
  if (hasSalesManagerAccess(roleNames)) return "Sales Manager";
  if (roleNames.some((r) => normalizeRoleName(r) === "client_viewer")) {
    return "Client Viewer";
  }
  return "Member";
}
