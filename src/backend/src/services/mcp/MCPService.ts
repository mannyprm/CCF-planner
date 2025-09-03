import { EventEmitter } from 'events';
import { MCPClient } from './MCPClient';
import { MCPServerConfig, MCPConnection, MCPConnectionState, MCPRequest, MCPResponse } from './types';
import { logger } from '../../utils/logger';
import { mcpConfig } from '../../config/mcp.config';

export class MCPService extends EventEmitter {
  private static instance: MCPService;
  private clients: Map<string, MCPClient> = new Map();
  private connections: Map<string, MCPConnection> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing MCP Service...');
    
    // Load server configurations
    const servers = mcpConfig.servers;
    
    for (const serverConfig of servers) {
      try {
        await this.addServer(serverConfig);
      } catch (error) {
        logger.error(`Failed to add MCP server ${serverConfig.name}:`, error);
      }
    }

    logger.info(`MCP Service initialized with ${this.clients.size} servers`);
  }

  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      throw new Error(`Server ${config.name} already exists`);
    }

    const client = new MCPClient(config);
    
    // Set up event listeners
    client.on('connected', (capabilities) => {
      const connection: MCPConnection = {
        id: `conn_${Date.now()}`,
        serverId: config.name,
        state: MCPConnectionState.CONNECTED,
        capabilities,
        lastConnected: new Date(),
      };
      this.connections.set(config.name, connection);
      this.emit('serverConnected', config.name, capabilities);
      logger.info(`Connected to MCP server: ${config.name}`);
    });

    client.on('disconnected', () => {
      const connection = this.connections.get(config.name);
      if (connection) {
        connection.state = MCPConnectionState.DISCONNECTED;
      }
      this.emit('serverDisconnected', config.name);
      logger.info(`Disconnected from MCP server: ${config.name}`);
    });

    client.on('error', (error) => {
      const connection = this.connections.get(config.name);
      if (connection) {
        connection.state = MCPConnectionState.ERROR;
        connection.error = error.message;
      }
      this.emit('serverError', config.name, error);
      logger.error(`MCP server error (${config.name}):`, error);
    });

    client.on('notification', (notification) => {
      this.emit('notification', config.name, notification);
    });

    this.clients.set(config.name, client);

    // Auto-connect if enabled
    if (config.autoConnect !== false) {
      await client.connect();
    }
  }

  async removeServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not found`);
    }

    await client.disconnect();
    this.clients.delete(serverName);
    this.connections.delete(serverName);
    logger.info(`Removed MCP server: ${serverName}`);
  }

  async connectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not found`);
    }

    await client.connect();
  }

  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not found`);
    }

    await client.disconnect();
  }

  async callTool<T = any>(
    serverName: string,
    toolName: string,
    args?: any,
    options?: { timeout?: number }
  ): Promise<MCPResponse<T>> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not found`);
    }

    if (!client.isConnected()) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    return client.request<T>({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      timeout: options?.timeout,
    });
  }

  async getResource<T = any>(
    serverName: string,
    uri: string,
    options?: { timeout?: number }
  ): Promise<MCPResponse<T>> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not found`);
    }

    if (!client.isConnected()) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    return client.request<T>({
      method: 'resources/read',
      params: { uri },
      timeout: options?.timeout,
    });
  }

  async listTools(serverName?: string): Promise<any[]> {
    if (serverName) {
      const client = this.clients.get(serverName);
      if (!client) {
        throw new Error(`Server ${serverName} not found`);
      }

      const capabilities = client.getCapabilities();
      return capabilities?.tools || [];
    }

    // Return tools from all connected servers
    const allTools: any[] = [];
    for (const [name, client] of this.clients) {
      if (client.isConnected()) {
        const capabilities = client.getCapabilities();
        const tools = capabilities?.tools || [];
        allTools.push(...tools.map(tool => ({ ...tool, server: name })));
      }
    }
    return allTools;
  }

  async listResources(serverName?: string): Promise<any[]> {
    if (serverName) {
      const client = this.clients.get(serverName);
      if (!client) {
        throw new Error(`Server ${serverName} not found`);
      }

      const capabilities = client.getCapabilities();
      return capabilities?.resources || [];
    }

    // Return resources from all connected servers
    const allResources: any[] = [];
    for (const [name, client] of this.clients) {
      if (client.isConnected()) {
        const capabilities = client.getCapabilities();
        const resources = capabilities?.resources || [];
        allResources.push(...resources.map(resource => ({ ...resource, server: name })));
      }
    }
    return allResources;
  }

  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(serverName: string): MCPConnection | undefined {
    return this.connections.get(serverName);
  }

  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  getAllClients(): Map<string, MCPClient> {
    return new Map(this.clients);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP Service...');
    
    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect().catch(error =>
        logger.error('Error disconnecting client:', error)
      )
    );

    await Promise.all(disconnectPromises);
    
    this.clients.clear();
    this.connections.clear();
    
    logger.info('MCP Service shutdown complete');
  }
}