export const AUTH_STORAGE_KEYS = {
  lastRedirectPath: "gandiv:lastRedirectPath",
  debug: "gandiv:auth-debug",
} as const;

export const PUBLIC_PATHS = ["/login"] as const;

export const ROLE_ROUTE_ACCESS: Record<string, string[]> = {
  "/admin": ["admin"],
  "/agent": ["agent"],
  "/tl": ["team_leader", "tl", "operations_manager"],
  "/sales": ["sales", "sales_manager", "admin"],
  "/qa": ["qa", "admin"],
  "/mis": ["mis", "admin"],
  "/dc": ["dc"],
};

export const COMMAND_CENTER_ROLES = [
  "client_viewer",
  "internal_operator",
  "internal_admin",
] as const;

export type CommandCenterRole = (typeof COMMAND_CENTER_ROLES)[number];

export const ROLE_DEFAULT_REDIRECT: Record<string, string> = {
  admin: "/admin/dashboard",
  agent: "/agent/dashboard",
  team_leader: "/tl/dashboard",
  tl: "/tl/dashboard",
  operations_manager: "/tl/dashboard",
  sales_manager: "/sales/dashboard",
  sales: "/sales",
  qa: "/qa/dashboard",
  mis: "/mis/dashboard",
  dc: "/dc/dashboard",
  client_viewer: "/dashboard/campaigns",
  internal_operator: "/dashboard/campaigns",
  internal_admin: "/dashboard/campaigns",
};

export function normalizeRoleName(roleName: string | null | undefined) {
  return roleName?.toLowerCase().replace(/\s+/g, "_") ?? "";
}

export function normalizeRoleNames(roleNames: Array<string | null | undefined>) {
  return Array.from(
    new Set(roleNames.map((roleName) => normalizeRoleName(roleName)).filter(Boolean))
  );
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getRequiredRoles(pathname: string) {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_ACCESS)) {
    if (pathname.startsWith(prefix)) {
      return roles;
    }
  }

  return null;
}

export function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    getRequiredRoles(pathname) !== null
  );
}

export function getDefaultRedirectPath(roleNames: Array<string | null | undefined>) {
  const normalizedRoles = normalizeRoleNames(roleNames);

  for (const role of normalizedRoles) {
    const redirectPath = ROLE_DEFAULT_REDIRECT[role];
    if (redirectPath) {
      return redirectPath;
    }
  }

  return "/agent/dashboard";
}

export function canAccessPath(pathname: string, roleNames: Array<string | null | undefined>) {
  const normalizedRoles = normalizeRoleNames(roleNames);

  if (normalizedRoles.length === 0) {
    return false;
  }

  if (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) {
    return true;
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.some((role) => normalizedRoles.includes(normalizeRoleName(role)));
}

export function sanitizeRedirectPath(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  if (!input.startsWith("/") || input.startsWith("//")) {
    return null;
  }

  if (isPublicPath(input)) {
    return null;
  }

  return input;
}

export function resolvePostLoginRedirect(options: {
  requestedPath?: string | null;
  storedPath?: string | null;
  roleNames: Array<string | null | undefined>;
}) {
  const requestedPath = sanitizeRedirectPath(options.requestedPath);
  if (requestedPath && canAccessPath(requestedPath, options.roleNames)) {
    return requestedPath;
  }

  const storedPath = sanitizeRedirectPath(options.storedPath);
  if (storedPath && canAccessPath(storedPath, options.roleNames)) {
    return storedPath;
  }

  return getDefaultRedirectPath(options.roleNames);
}

export function buildLoginRedirectPath(pathname: string, search = "") {
  const redirectTarget = sanitizeRedirectPath(`${pathname}${search}`);
  if (!redirectTarget) {
    return "/login";
  }

  const params = new URLSearchParams({ redirect: redirectTarget });
  return `/login?${params.toString()}`;
}
