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
  
  return networks;
}

/**
 * Calculate the IP range from CIDR notation
 */
function getIPRange(cidr: string): string[] {
  const [baseIP, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  const parts = baseIP.split('.').map(Number);
  const ips: string[] = [];
  
  // Support /24 (most common) and /16 networks
  if (prefix === 24) {
    const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
    // Skip .0 (network address) and .255 (broadcast address)
    for (let i = 1; i < 255; i++) {
      ips.push(`${networkBase}.${i}`);
    }
  } else if (prefix === 16) {
    const networkBase = `${parts[0]}.${parts[1]}`;
    // For /16, scan common ranges (skip full 65k hosts)
    // Focus on .1.x and .0.x subnets which are most common
    for (let j = 0; j < 2; j++) {
      for (let i = 1; i < 255; i++) {
        ips.push(`${networkBase}.${j}.${i}`);
      }
    }
  } else {
    console.warn(`[Network Discovery] Unsupported prefix /${prefix}, only /24 and /16 are supported`);
    return [];
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
        try {
          // Check if response has minimum size and valid tag
          if (msg.length > 8) {
            const response = msg.readUInt32LE(0);
            const tagId = ((response >> 20) & 0x0FFF);
            
            // TAG_ID for Odamex is 0xAD0
            if (tagId === 0xAD0) {
              socket.close();
              resolve({
                address: { ip, port },
                ping,
                responded: true,
                // Basic info - full parsing would require complete protocol implementation
                name: `Server at ${ip}:${port}`,
                players: [],
                wads: [],
                currentMap: null,
                maxClients: null,
                maxPlayers: null,
                gameType: 0,
                versionMajor: null,
                versionMinor: null,
                versionPatch: null,
              } as ServerInfo);
            } else {
              socket.close();
              resolve(null);
            }
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
      // Send Odamex SERVER_CHALLENGE query packet (0xAD011002)
      const queryPacket = Buffer.alloc(4);
      queryPacket.writeUInt32LE(0xAD011002, 0);
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
  const networks = getLocalNetworks();
  if (networks.length === 0) {
    return [];
  }
  
  const allIPs: string[] = [];
  for (const network of networks) {
    const ips = getIPRange(network.cidr);
    allIPs.push(...ips);
  }
  
  const { portRangeStart, portRangeEnd, scanTimeout, maxConcurrent } = options;
  const portCount = portRangeEnd - portRangeStart + 1;
  
  console.log(`[Network Discovery] Scanning ${allIPs.length} IPs on ${portCount} port(s)`);
  console.log(`[Network Discovery] Port range: ${portRangeStart}-${portRangeEnd}`);
  console.log(`[Network Discovery] Timeout: ${scanTimeout}ms, Concurrency: ${maxConcurrent}`);
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
      }
    }
    
    completed += batch.length;
  }
  
  console.log(`[Network Discovery] Scan complete - scanned ${completed} combinations, found ${servers.length} server(s)`);
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
}
