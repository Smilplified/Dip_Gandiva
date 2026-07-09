const MOBILE_UA_PATTERNS: RegExp[] = [
  /android/i,
  /iphone/i,
  /ipod/i,
  /ipad/i,
  /blackberry/i,
  /bb10/i,
  /windows phone/i,
  /iemobile/i,
  /opera mini/i,
  /crios/i, // Chrome on iOS
  /fxios/i, // Firefox on iOS
  /edgios/i, // Edge on iOS
  /edga/i, // Edge on Android
  /samsungbrowser/i,
  /ucbrowser/i,
  /opios/i, // Opera on iOS
  /opr\/[\d.]+.*mobile/i,
  /mobile.*firefox/i,
  /firefox.*mobile/i,
  /mobile.*safari/i,
  /webos/i,
  /kindle/i,
  /silk\//i,
  /playbook/i,
];

const MOBILE_CLIENT_HINT_PLATFORMS = ["android", "ios", "ipados", "chrome os"];

function hasMobileClientHints(headers: Headers): boolean {
  const mobileHint = headers.get("sec-ch-ua-mobile");
  if (mobileHint === "?1") {
    return true;
  }

  const platformHint = headers.get("sec-ch-ua-platform")?.replace(/"/g, "").toLowerCase() ?? "";
  if (platformHint && MOBILE_CLIENT_HINT_PLATFORMS.includes(platformHint)) {
    return true;
  }

  const deviceType = headers.get("cf-device-type")?.toLowerCase();
  if (deviceType === "mobile" || deviceType === "tablet") {
    return true;
  }

  return false;
}

function matchesMobileUserAgent(userAgent: string): boolean {
  if (!userAgent.trim()) {
    return false;
  }

  if (MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return true;
  }

  // Generic "Mobile" token — reliable for most mobile browsers.
  if (/\bmobile\b/i.test(userAgent)) {
    return true;
  }

  return false;
}

/**
 * Detects mobile and tablet browsers from User-Agent and optional client hints.
 * Desktop Windows, macOS, and Linux browsers are allowed through.
 */
export function isMobileUserAgent(userAgent: string | null | undefined, headers?: Headers): boolean {
  const ua = userAgent ?? "";

  if (headers && hasMobileClientHints(headers)) {
    return true;
  }

  return matchesMobileUserAgent(ua);
}
