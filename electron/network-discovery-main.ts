// @ts-nocheck
import { ipcMain } from 'electron';
import * as dgram from 'dgram';
import * as os from 'os';

/**
 * Network interface information
 */
export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  cidr: string;
}

/**
 * Local discovery scan options
 */
export interface ScanOptions {
  portRangeStart: number;
  portRangeEnd: number;
  scanTimeout: number;
  maxConcurrent: number;
}

/**
 * Server information returned from scanning
 */
export interface ServerInfo {
  address: { ip: string; port: number };
  ping?: number;
  [key: string]: any;
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // Class A: 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // Class B: 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // Class C: 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // Link-local: 169.254.0.0/16
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  return false;
}

/**
 * Get all local network interfaces on private subnets
 */
export function getLocalNetworks(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const networks: NetworkInterface[] = [];
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    
    for (const addr of addrs) {
      // Only IPv4, not internal/loopback, and must be private
      if (addr.family === 'IPv4' && !addr.internal && isPrivateIP(addr.address)) {
        networks.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          cidr: addr.cidr || `${addr.address}/24` // Fallback if cidr not available
        });
      }
    }
  }
  
  console.log('[Network Discovery] Detected networks:', networks);
  return networks;
}

/**
 * Calculate the IP range from CIDR notation
 */
function getIPRange(cidr: string): string[] {
  const [baseIP, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  // Only support /24 for now (254 hosts) - most common home network
  if (prefix !== 24) {
    console.warn(`[Network Discovery] Unsupported prefix /${prefix}, only /24 is supported`);
    return [];
  }
  
  const parts = baseIP.split('.').map(Number);
  const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
  
  const ips: string[] = [];
  // Skip .0 (network address) and .255 (broadcast address)
  for (let i = 1; i < 255; i++) {
    ips.push(`${networkBase}.${i}`);
  }
  
  return ips;
}

/**
 * Query a single Odamex server
 */
async function queryServer(ip: string, port: number, timeout: number): Promise<ServerInfo | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const startTime = Date.now();
    let resolved = false;
    
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.close();
        resolve(null);
      }
    }, timeout);
    
    socket.on('message', (msg) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        
        const ping = Date.now() - startTime;
        
        // Parse Odamex server response
        // This is a simplified version - in reality, you'd parse the full response
        try {
          // Basic check if it looks like an Odamex response
          if (msg.length > 0) {
            socket.close();
            resolve({
              address: { ip, port },
              ping,
              // Additional parsing would go here
            });
          } else {
            socket.close();
            resolve(null);
          }
        } catch (err) {
          socket.close();
          resolve(null);
        }
      }
    });
    
    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    });
    
    try {
      // Send Odamex query packet
      // LAUNCHER_CHALLENGE (0x00, 0x00, 0x00, 0xAD)
      const queryPacket = Buffer.from([0x00, 0x00, 0x00, 0xAD]);
      socket.send(queryPacket, port, ip);
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    }
  });
}

/**
 * Scan local network for Odamex servers
 */
export async function discoverLocalServers(options: ScanOptions): Promise<ServerInfo[]> {
  console.log('[Network Discovery] Starting scan with options:', options);
  
  const networks = getLocalNetworks();
  if (networks.length === 0) {
    console.log('[Network Discovery] No private networks detected');
    return [];
  }
  
  const allIPs: string[] = [];
  for (const network of networks) {
    const ips = getIPRange(network.cidr);
    allIPs.push(...ips);
  }
  
  console.log(`[Network Discovery] Scanning ${allIPs.length} IPs across ${networks.length} network(s)`);
  
  const { portRangeStart, portRangeEnd, scanTimeout, maxConcurrent } = options;
  const ports: number[] = [];
  for (let port = portRangeStart; port <= portRangeEnd; port++) {
    ports.push(port);
  }
  
  const servers: ServerInfo[] = [];
  const queries: Promise<ServerInfo | null>[] = [];
  let completed = 0;
  const total = allIPs.length * ports.length;
  
  // Create all query promises
  for (const ip of allIPs) {
    for (const port of ports) {
      queries.push(queryServer(ip, port, scanTimeout));
    }
  }
  
  // Execute queries with concurrency limit
  for (let i = 0; i < queries.length; i += maxConcurrent) {
    const batch = queries.slice(i, i + maxConcurrent);
    const results = await Promise.all(batch);
    
    for (const result of results) {
      if (result) {
        servers.push(result);
        console.log(`[Network Discovery] Found server at ${result.address.ip}:${result.address.port}`);
      }
    }
    
    completed += batch.length;
    if (completed % 1000 === 0) {
      console.log(`[Network Discovery] Progress: ${completed}/${total} (${Math.round(completed / total * 100)}%)`);
    }
  }
  
  console.log(`[Network Discovery] Scan complete - found ${servers.length} server(s)`);
  return servers;
}

/**
 * Register IPC handlers for network discovery
 */
export function registerNetworkDiscoveryHandlers(): void {
  // Get local networks
  ipcMain.handle('network-discovery:get-networks', async () => {
    try {
      return getLocalNetworks();
    } catch (err) {
      console.error('[Network Discovery] Error getting networks:', err);
      throw err;
    }
  });
  
  // Discover local servers
  ipcMain.handle('network-discovery:scan', async (_event, options: ScanOptions) => {
    try {
      return await discoverLocalServers(options);
    } catch (err) {
      console.error('[Network Discovery] Error during scan:', err);
      throw err;
    }
  });
  
  console.log('[Network Discovery] IPC handlers registered');
}
