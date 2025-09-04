export interface MCPServerConfig {
  name: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  /** Auto-connect to the server on service initialization (default: true) */
  autoConnect?: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface MCPRequest {
  method: string;
  params?: any;
  timeout?: number;
}

export interface MCPResponse<T = any> {
  result?: T;
  error?: MCPError;
  metadata?: Record<string, any>;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any;
}

export interface MCPCapabilities {
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}

export enum MCPConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface MCPConnection {
  id: string;
  serverId: string;
  state: MCPConnectionState;
  capabilities?: MCPCapabilities;
  lastConnected?: Date;
  error?: string;
}
