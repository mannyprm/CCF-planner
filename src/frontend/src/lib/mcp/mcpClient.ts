import axios, { AxiosInstance } from 'axios';

export interface MCPConnection {
  id: string;
  serverId: string;
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  capabilities?: any;
  lastConnected?: Date;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  server?: string;
  inputSchema?: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  server?: string;
}

export interface MCPCallOptions {
  server: string;
  tool: string;
  arguments?: any;
  timeout?: number;
}

export interface MCPResourceOptions {
  server: string;
  uri: string;
  timeout?: number;
}

class MCPClient {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: `${baseURL}/mcp`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Connection management
  async getConnections(): Promise<MCPConnection[]> {
    const response = await this.api.get('/connections');
    return response.data.data;
  }

  async getConnection(serverName: string): Promise<MCPConnection> {
    const response = await this.api.get(`/connections/${serverName}`);
    return response.data.data;
  }

  async connect(serverName: string): Promise<void> {
    await this.api.post(`/connections/${serverName}/connect`);
  }

  async disconnect(serverName: string): Promise<void> {
    await this.api.post(`/connections/${serverName}/disconnect`);
  }

  // Tools
  async listTools(serverName?: string): Promise<MCPTool[]> {
    const params = serverName ? { server: serverName } : {};
    const response = await this.api.get('/tools', { params });
    return response.data.data;
  }

  async callTool<T = any>(options: MCPCallOptions): Promise<T> {
    const response = await this.api.post('/tools/call', {
      server: options.server,
      tool: options.tool,
      arguments: options.arguments,
      timeout: options.timeout,
    });
    return response.data.data;
  }

  // Resources
  async listResources(serverName?: string): Promise<MCPResource[]> {
    const params = serverName ? { server: serverName } : {};
    const response = await this.api.get('/resources', { params });
    return response.data.data;
  }

  async getResource<T = any>(options: MCPResourceOptions): Promise<T> {
    const response = await this.api.post('/resources/get', {
      server: options.server,
      uri: options.uri,
      timeout: options.timeout,
    });
    return response.data.data;
  }

  // Health check
  async checkHealth(): Promise<{
    healthy: boolean;
    connections: Array<{
      server: string;
      state: string;
      lastConnected?: Date;
      error?: string;
    }>;
  }> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const mcpClient = new MCPClient();

// Export for custom instances
export default MCPClient;