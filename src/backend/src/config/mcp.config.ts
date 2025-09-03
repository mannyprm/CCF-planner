import { MCPServerConfig } from '../services/mcp/types';

export interface MCPConfig {
  servers: MCPServerConfig[];
  defaultTimeout: number;
  enableAutoConnect: boolean;
  enableHealthCheck: boolean;
  healthCheckInterval: number;
}

export const mcpConfig: MCPConfig = {
  servers: [
    {
      name: 'claude-flow',
      command: 'npx',
      args: ['claude-flow@alpha', 'mcp', 'start'],
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      autoConnect: true,
    },
    {
      name: 'filesystem',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem'],
      env: {
        ALLOWED_PATHS: process.env.MCP_FILESYSTEM_PATHS || '/tmp',
      },
      timeout: 10000,
      retryPolicy: {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
      },
      autoConnect: false,
    },
    // Add more MCP servers as needed
  ],
  defaultTimeout: 30000,
  enableAutoConnect: true,
  enableHealthCheck: true,
  healthCheckInterval: 60000, // 1 minute
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  mcpConfig.servers.forEach(server => {
    server.timeout = (server.timeout || mcpConfig.defaultTimeout) * 2;
    if (server.retryPolicy) {
      server.retryPolicy.maxRetries = 5;
    }
  });
}

if (process.env.MCP_SERVERS) {
  try {
    const customServers = JSON.parse(process.env.MCP_SERVERS);
    mcpConfig.servers.push(...customServers);
  } catch (error) {
    console.error('Failed to parse MCP_SERVERS environment variable:', error);
  }
}