/**
 * Simple User Agent Parser
 * Returns a human-readable string like "Chrome on Windows" or "Safari on iPhone"
 */
export const parseUA = (uaString) => {
  if (!uaString) return "Unknown Device";

  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Detect OS
  if (uaString.includes("Windows")) os = "Windows";
  else if (uaString.includes("iPhone")) os = "iPhone";
  else if (uaString.includes("iPad")) os = "iPad";
  else if (uaString.includes("Android")) os = "Android";
  else if (uaString.includes("Macintosh")) os = "Mac";
  else if (uaString.includes("Linux")) os = "Linux";

  // Detect Browser
  if (uaString.includes("Edg/")) browser = "Edge";
  else if (uaString.includes("Chrome") && !uaString.includes("Edg/")) browser = "Chrome";
  else if (uaString.includes("Safari") && !uaString.includes("Chrome")) browser = "Safari";
  else if (uaString.includes("Firefox")) browser = "Firefox";
  else if (uaString.includes("MSIE") || uaString.includes("Trident/")) browser = "IE";

  return `\${browser} on \${os}`;
};
