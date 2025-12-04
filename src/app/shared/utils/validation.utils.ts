/**
 * Input validation and sanitization utilities
 * 
 * Provides safe input validation for:
 * - Network addresses (IP:port)
 * - File paths
 * - User-provided strings
 * 
 * @module validation
 */

/**
 * Validation result with error details
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Sanitized value if valid */
  sanitized?: string;
}

/**
 * Validate and sanitize an IP address
 * 
 * @param ip IP address string
 * @returns Validation result
 * 
 * @example
 * const result = validateIPAddress('192.168.1.1');
 * if (result.valid) {
 *   console.log('Valid IP:', result.sanitized);
 * }
 */
export function validateIPAddress(ip: string): ValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { valid: false, error: 'IP address is required' };
  }

  const sanitized = ip.trim();
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = sanitized.match(ipv4Regex);
  
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.every(octet => octet >= 0 && octet <= 255)) {
      return { valid: true, sanitized };
    }
    return { valid: false, error: 'Invalid IPv4 address (octets must be 0-255)' };
  }
  
  // Hostname validation (for master server addresses)
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (hostnameRegex.test(sanitized) && sanitized.length <= 253) {
    return { valid: true, sanitized };
  }
  
  return { valid: false, error: 'Invalid IP address or hostname' };
}

/**
 * Validate and sanitize a port number
 * 
 * @param port Port number or string
 * @returns Validation result
 */
export function validatePort(port: number | string): ValidationResult {
  const portNum = typeof port === 'string' ? parseInt(port.trim(), 10) : port;
  
  if (isNaN(portNum)) {
    return { valid: false, error: 'Port must be a number' };
  }
  
  if (portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Port must be between 1 and 65535' };
  }
  
  return { valid: true, sanitized: portNum.toString() };
}

/**
 * Validate and sanitize a server address (IP:port or hostname:port)
 * 
 * @param address Server address string
 * @returns Validation result with parsed IP and port
 */
export function validateServerAddress(address: string): ValidationResult & { ip?: string; port?: number } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Server address is required' };
  }

  const sanitized = address.trim();
  const parts = sanitized.split(':');
  
  if (parts.length !== 2) {
    return { valid: false, error: 'Server address must be in format IP:port or hostname:port' };
  }
  
  const [ipPart, portPart] = parts;
  
  const ipResult = validateIPAddress(ipPart);
  if (!ipResult.valid) {
    return { valid: false, error: `Invalid address: ${ipResult.error}` };
  }
  
  const portResult = validatePort(portPart);
  if (!portResult.valid) {
    return { valid: false, error: `Invalid port: ${portResult.error}` };
  }
  
  return {
    valid: true,
    sanitized,
    ip: ipResult.sanitized,
    port: parseInt(portResult.sanitized!, 10)
  };
}

/**
 * Sanitize a file path to prevent directory traversal attacks
 * 
 * @param filePath User-provided file path
 * @returns Validation result
 */
export function sanitizeFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path is required' };
  }

  const sanitized = filePath.trim();
  
  // Check for directory traversal attempts
  if (sanitized.includes('..') || sanitized.includes('~')) {
    return { valid: false, error: 'Invalid file path (directory traversal not allowed)' };
  }
  
  // Check for null bytes
  if (sanitized.includes('\0')) {
    return { valid: false, error: 'Invalid file path (null byte detected)' };
  }
  
  // On Windows, check for invalid characters
  if (process.platform === 'win32') {
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(sanitized)) {
      return { valid: false, error: 'Invalid file path (contains illegal characters)' };
    }
  }
  
  return { valid: true, sanitized };
}

/**
 * Sanitize user input text to prevent XSS
 * 
 * @param text User-provided text
 * @param maxLength Maximum allowed length
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text.trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Validate a URL
 * 
 * @param url URL string
 * @param allowedProtocols Allowed protocols (default: ['http', 'https'])
 * @returns Validation result
 */
export function validateURL(url: string, allowedProtocols: string[] = ['http', 'https']): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const sanitized = url.trim();
  
  try {
    const parsed = new URL(sanitized);
    
    const protocol = parsed.protocol.slice(0, -1); // Remove trailing ':'
    if (!allowedProtocols.includes(protocol)) {
      return { valid: false, error: `Protocol must be one of: ${allowedProtocols.join(', ')}` };
    }
    
    return { valid: true, sanitized };
  } catch (err) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
