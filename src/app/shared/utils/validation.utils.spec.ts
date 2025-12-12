import {
  validateIPAddress,
  validatePort,
  validateServerAddress,
  sanitizeFilePath,
  sanitizeText,
  validateURL,
  ValidationResult
} from './validation.utils';

describe('validation.utils', () => {
  describe('validateIPAddress', () => {
    it('should validate correct IPv4 addresses', () => {
      const result = validateIPAddress('192.168.1.1');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('192.168.1.1');
    });

    it('should validate hostnames', () => {
      const result = validateIPAddress('example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('example.com');
    });

    it('should trim whitespace', () => {
      const result = validateIPAddress('  192.168.1.1  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('192.168.1.1');
    });

    it('should reject invalid octets', () => {
      const result = validateIPAddress('256.1.1.1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid IPv4 address (octets must be 0-255)');
    });

    it('should accept strings that could be hostnames', () => {
      // '192.168.1' doesn't match IPv4 pattern but is valid hostname format
      const result = validateIPAddress('192.168.1');
      expect(result.valid).toBe(true);
    });

    it('should reject empty input', () => {
      const result = validateIPAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is required');
    });

    it('should reject non-string input', () => {
      const result = validateIPAddress(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is required');
    });

    it('should validate hostnames with hyphens', () => {
      const result = validateIPAddress('my-server.example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject hostnames exceeding 253 characters', () => {
      const longHost = 'a'.repeat(254);
      const result = validateIPAddress(longHost);
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePort', () => {
    it('should validate port numbers', () => {
      const result = validatePort(80);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('80');
    });

    it('should validate port strings', () => {
      const result = validatePort('443');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('443');
    });

    it('should trim whitespace from strings', () => {
      const result = validatePort('  8080  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('8080');
    });

    it('should reject ports below 1', () => {
      const result = validatePort(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be between 1 and 65535');
    });

    it('should reject ports above 65535', () => {
      const result = validatePort(65536);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be between 1 and 65535');
    });

    it('should reject non-numeric strings', () => {
      const result = validatePort('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be a number');
    });

    it('should validate boundary ports', () => {
      expect(validatePort(1).valid).toBe(true);
      expect(validatePort(65535).valid).toBe(true);
    });
  });

  describe('validateServerAddress', () => {
    it('should validate correct server addresses', () => {
      const result = validateServerAddress('192.168.1.1:10666');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('192.168.1.1:10666');
      expect(result.ip).toBe('192.168.1.1');
      expect(result.port).toBe(10666);
    });

    it('should validate hostname:port addresses', () => {
      const result = validateServerAddress('example.com:443');
      expect(result.valid).toBe(true);
      expect(result.ip).toBe('example.com');
      expect(result.port).toBe(443);
    });

    it('should trim whitespace', () => {
      const result = validateServerAddress('  192.168.1.1:80  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('192.168.1.1:80');
    });

    it('should reject addresses without colons', () => {
      const result = validateServerAddress('192.168.1.1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server address must be in format IP:port or hostname:port');
    });

    it('should reject addresses with multiple colons', () => {
      const result = validateServerAddress('192.168.1.1:80:443');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server address must be in format IP:port or hostname:port');
    });

    it('should reject invalid IP addresses', () => {
      const result = validateServerAddress('999.999.999.999:80');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid address');
    });

    it('should reject invalid ports', () => {
      const result = validateServerAddress('192.168.1.1:99999');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid port');
    });

    it('should reject empty input', () => {
      const result = validateServerAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server address is required');
    });
  });

  describe('sanitizeFilePath', () => {
    beforeEach(() => {
      // Mock window.electron.platform
      (window as any).electron = { platform: 'win32' };
    });

    it('should accept valid file paths', () => {
      const result = sanitizeFilePath('C:\\Users\\Documents\\file.txt');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('C:\\Users\\Documents\\file.txt');
    });

    it('should trim whitespace', () => {
      const result = sanitizeFilePath('  /path/to/file.txt  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('/path/to/file.txt');
    });

    it('should reject directory traversal attempts with ..', () => {
      const result = sanitizeFilePath('../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file path (directory traversal not allowed)');
    });

    it('should reject paths with tilde', () => {
      const result = sanitizeFilePath('~/documents/file.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file path (directory traversal not allowed)');
    });

    it('should reject paths with null bytes', () => {
      const result = sanitizeFilePath('path/to/file\0.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file path (null byte detected)');
    });

    it('should reject Windows paths with invalid characters', () => {
      expect(sanitizeFilePath('C:\\Users\\<invalid>.txt').valid).toBe(false);
      expect(sanitizeFilePath('C:\\Users\\>invalid<.txt').valid).toBe(false);
      expect(sanitizeFilePath('C:\\Users\\file|name.txt').valid).toBe(false);
      expect(sanitizeFilePath('C:\\Users\\file?.txt').valid).toBe(false);
      expect(sanitizeFilePath('C:\\Users\\file*.txt').valid).toBe(false);
    });

    it('should accept paths on non-Windows platforms', () => {
      (window as any).electron = { platform: 'linux' };
      const result = sanitizeFilePath('/home/user/file.txt');
      expect(result.valid).toBe(true);
    });

    it('should reject empty paths', () => {
      const result = sanitizeFilePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File path is required');
    });

    it('should reject non-string input', () => {
      const result = sanitizeFilePath(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File path is required');
    });
  });

  describe('sanitizeText', () => {
    it('should return trimmed text', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(2000);
      const result = sanitizeText(longText, 100);
      expect(result.length).toBe(100);
    });

    it('should use default max length of 1000', () => {
      const longText = 'a'.repeat(2000);
      const result = sanitizeText(longText);
      expect(result.length).toBe(1000);
    });

    it('should remove null bytes', () => {
      const result = sanitizeText('hello\0world');
      expect(result).toBe('helloworld');
      expect(result.includes('\0')).toBe(false);
    });

    it('should remove control characters', () => {
      const result = sanitizeText('hello\x01\x02\x03world');
      expect(result).toBe('helloworld');
    });

    it('should preserve newlines and tabs', () => {
      const result = sanitizeText('hello\n\tworld');
      expect(result).toBe('hello\n\tworld');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('should handle text within max length', () => {
      const text = 'Normal text';
      expect(sanitizeText(text, 100)).toBe(text);
    });
  });

  describe('validateURL', () => {
    it('should validate HTTP URLs', () => {
      const result = validateURL('http://example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('http://example.com');
    });

    it('should validate HTTPS URLs', () => {
      const result = validateURL('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateURL('  https://example.com  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://example.com');
    });

    it('should reject non-HTTP(S) protocols by default', () => {
      const result = validateURL('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Protocol must be one of: http, https');
    });

    it('should allow custom protocols', () => {
      const result = validateURL('ftp://example.com', ['ftp']);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const result = validateURL('not a url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should reject empty URLs', () => {
      const result = validateURL('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL is required');
    });

    it('should validate URLs with paths and query strings', () => {
      const result = validateURL('https://example.com/path?query=value');
      expect(result.valid).toBe(true);
    });

    it('should validate URLs with ports', () => {
      const result = validateURL('https://example.com:8080');
      expect(result.valid).toBe(true);
    });

    it('should handle multiple allowed protocols', () => {
      expect(validateURL('http://example.com', ['http', 'https']).valid).toBe(true);
      expect(validateURL('https://example.com', ['http', 'https']).valid).toBe(true);
      expect(validateURL('ftp://example.com', ['http', 'https']).valid).toBe(false);
    });
  });
});
