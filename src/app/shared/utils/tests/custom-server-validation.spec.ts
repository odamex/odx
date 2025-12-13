import {
  isValidIPv4,
  isValidDomain,
  isValidPort,
  validateCustomServerAddress,
  parseCustomServerAddress
} from '../custom-server-validation';

describe('custom-server-validation', () => {
  describe('isValidIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('10.0.0.1')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false);
      expect(isValidIPv4('1.256.1.1')).toBe(false);
      expect(isValidIPv4('1.1.256.1')).toBe(false);
      expect(isValidIPv4('1.1.1.256')).toBe(false);
    });

    it('should reject malformed IP addresses', () => {
      expect(isValidIPv4('192.168.1')).toBe(false);
      expect(isValidIPv4('192.168.1.1.1')).toBe(false);
      expect(isValidIPv4('192.168.1.a')).toBe(false);
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIPv4('')).toBe(false);
    });

    it('should handle octets with leading zeros', () => {
      expect(isValidIPv4('192.168.001.001')).toBe(true);
      expect(isValidIPv4('010.010.010.010')).toBe(true);
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domain names', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('my-server.example.com')).toBe(true);
      expect(isValidDomain('a1.b2.c3.example.com')).toBe(true);
      expect(isValidDomain('localhost')).toBe(true);
    });

    it('should reject invalid domain names', () => {
      expect(isValidDomain('-invalid.com')).toBe(false);
      expect(isValidDomain('invalid-.com')).toBe(false);
      expect(isValidDomain('.invalid.com')).toBe(false);
      expect(isValidDomain('invalid..com')).toBe(false);
      expect(isValidDomain('invalid.com.')).toBe(false);
    });

    it('should reject domains that are too short', () => {
      expect(isValidDomain('a')).toBe(false);
      expect(isValidDomain('')).toBe(false);
    });

    it('should reject domains with labels exceeding 63 characters', () => {
      const longLabel = 'a'.repeat(64);
      expect(isValidDomain(`${longLabel}.com`)).toBe(false);
      expect(isValidDomain(`valid.${longLabel}.com`)).toBe(false);
    });

    it('should accept domains with labels at 63 character limit', () => {
      const maxLabel = 'a'.repeat(63);
      expect(isValidDomain(`${maxLabel}.com`)).toBe(true);
    });

    it('should reject domains with special characters', () => {
      expect(isValidDomain('test@example.com')).toBe(false);
      expect(isValidDomain('test_server.com')).toBe(false);
      expect(isValidDomain('test server.com')).toBe(false);
    });
  });

  describe('isValidPort', () => {
    it('should validate correct port numbers', () => {
      expect(isValidPort('1')).toBe(true);
      expect(isValidPort('80')).toBe(true);
      expect(isValidPort('443')).toBe(true);
      expect(isValidPort('10666')).toBe(true);
      expect(isValidPort('65535')).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      expect(isValidPort('0')).toBe(false);
      expect(isValidPort('65536')).toBe(false);
      expect(isValidPort('-1')).toBe(false);
      expect(isValidPort('99999')).toBe(false);
    });

    it('should reject non-numeric ports', () => {
      expect(isValidPort('abc')).toBe(false);
      expect(isValidPort('')).toBe(false);
      expect(isValidPort('  ')).toBe(false);
    });

    it('should handle strings that start with numbers', () => {
      // parseInt truncates at first non-numeric character
      expect(isValidPort('80a')).toBe(true); // parses as 80
      expect(isValidPort('443.0')).toBe(true); // parses as 443
    });
  });

  describe('validateCustomServerAddress', () => {
    it('should validate correct IPv4:port addresses', () => {
      const result = validateCustomServerAddress('192.168.1.1:10666');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate correct domain:port addresses', () => {
      const result = validateCustomServerAddress('example.com:10666');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty addresses', () => {
      expect(validateCustomServerAddress('').valid).toBe(false);
      expect(validateCustomServerAddress('').error).toBe('Address cannot be empty');
      
      expect(validateCustomServerAddress('   ').valid).toBe(false);
      expect(validateCustomServerAddress('   ').error).toBe('Address cannot be empty');
    });

    it('should reject addresses without port', () => {
      const result = validateCustomServerAddress('192.168.1.1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address must include port (format: IP:port or domain:port)');
    });

    it('should reject addresses with invalid ports', () => {
      const result = validateCustomServerAddress('192.168.1.1:99999');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be a number between 1 and 65535');
    });

    it('should accept addresses that look like IPs but are hostnames', () => {
      // isValidIPv4 rejects 256, but validation falls through to hostname check
      const result = validateCustomServerAddress('256.1.1.1:10666');
      // This passes as a hostname since it matches hostname pattern
      expect(result.valid).toBe(true);
    });

    it('should handle trailing/leading whitespace', () => {
      const result = validateCustomServerAddress('  192.168.1.1:10666  ');
      expect(result.valid).toBe(true);
    });

    it('should handle multiple colons by using the last one', () => {
      // Future-proofing for IPv6, though not fully supported yet
      const result = validateCustomServerAddress('host:with:colons:10666');
      expect(result.valid).toBe(false); // 'host:with:colons' is not a valid domain
    });

    it('should reject invalid domain with valid port', () => {
      const result = validateCustomServerAddress('-invalid-.com:10666');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid IP address or domain name');
    });
  });

  describe('parseCustomServerAddress', () => {
    it('should parse valid IPv4:port addresses', () => {
      const result = parseCustomServerAddress('192.168.1.1:10666');
      expect(result).toEqual({ host: '192.168.1.1', port: 10666 });
    });

    it('should parse valid domain:port addresses', () => {
      const result = parseCustomServerAddress('example.com:443');
      expect(result).toEqual({ host: 'example.com', port: 443 });
    });

    it('should return null for invalid addresses', () => {
      expect(parseCustomServerAddress('invalid')).toBeNull();
      expect(parseCustomServerAddress('192.168.1.1')).toBeNull();
      expect(parseCustomServerAddress('!invalid!:10666')).toBeNull();
      expect(parseCustomServerAddress('')).toBeNull();
    });

    it('should handle whitespace in addresses', () => {
      // Validation trims, but host extraction uses trimmed address
      const result = parseCustomServerAddress('  192.168.1.1:10666  ');
      expect(result).not.toBeNull();
      expect(result!.host.trim()).toBe('192.168.1.1');
      expect(result!.port).toBe(10666);
    });

    it('should parse ports as numbers', () => {
      const result = parseCustomServerAddress('localhost:80');
      expect(result).not.toBeNull();
      expect(typeof result!.port).toBe('number');
      expect(result!.port).toBe(80);
    });
  });
});
