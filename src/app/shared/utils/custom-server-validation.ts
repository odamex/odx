/**
 * Validates whether a string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Pattern);
  
  if (!match) return false;
  
  // Check each octet is between 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }
  
  return true;
}

/**
 * Validates whether a string is a valid domain name
 */
export function isValidDomain(domain: string): boolean {
  // Basic domain validation: alphanumeric, hyphens, dots
  // Must start with alphanumeric, can have dots for subdomains
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  
  if (!domainPattern.test(domain)) return false;
  
  // Domain must be at least 2 characters
  if (domain.length < 2) return false;
  
  // No label (part between dots) should be longer than 63 characters
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63) return false;
  }
  
  return true;
}

/**
 * Validates whether a string is a valid port number
 */
export function isValidPort(port: string): boolean {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validates a custom server address (IPv4:port or domain:port)
 * Returns an object with validation result and error message
 */
export function validateCustomServerAddress(address: string): { valid: boolean; error?: string } {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'Address cannot be empty' };
  }
  
  const trimmed = address.trim();
  
  // Check if it contains a colon
  if (!trimmed.includes(':')) {
    return { valid: false, error: 'Address must include port (format: IP:port or domain:port)' };
  }
  
  // Split by last colon to handle IPv6 in the future if needed
  const lastColonIndex = trimmed.lastIndexOf(':');
  const hostPart = trimmed.substring(0, lastColonIndex);
  const portPart = trimmed.substring(lastColonIndex + 1);
  
  // Validate port
  if (!isValidPort(portPart)) {
    return { valid: false, error: 'Port must be a number between 1 and 65535' };
  }
  
  // Validate host (either IPv4 or domain)
  const isIpV4 = isValidIPv4(hostPart);
  const isDomain = isValidDomain(hostPart);
  
  if (!isIpV4 && !isDomain) {
    return { valid: false, error: 'Invalid IP address or domain name' };
  }
  
  return { valid: true };
}

/**
 * Parses a custom server address into host and port
 */
export function parseCustomServerAddress(address: string): { host: string; port: number } | null {
  const validation = validateCustomServerAddress(address);
  if (!validation.valid) {
    return null;
  }
  
  const lastColonIndex = address.lastIndexOf(':');
  const host = address.substring(0, lastColonIndex);
  const port = parseInt(address.substring(lastColonIndex + 1), 10);
  
  return { host, port };
}
