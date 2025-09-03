import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPConnectionState,
  MCPCapabilities,
  MCPError,
  RetryPolicy,
} from './types';
import { exponentialBackoff, circuitBreaker } from './utils';

export class MCPClient extends EventEmitter {
  private config: MCPServerConfig;
  private process?: ChildProcess;
  private state: MCPConnectionState = MCPConnectionState.DISCONNECTED;
  private capabilities?: MCPCapabilities;
  private requestQueue: Map<string, (response: MCPResponse) => void> = new Map();
  private retryPolicy: RetryPolicy;
  private circuitBreakerState = circuitBreaker();

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.retryPolicy = config.retryPolicy || {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    };
  }

  async connect(): Promise<void> {
    if (this.state === MCPConnectionState.CONNECTED) {
      return;
    }

    this.setState(MCPConnectionState.CONNECTING);

    try {
      if (this.config.command) {
        await this.connectProcess();
      } else if (this.config.url) {
        await this.connectHTTP();
      } else {
        throw new Error('No connection method specified');
      }

      await this.initialize();
      this.setState(MCPConnectionState.CONNECTED);
      this.emit('connected', this.capabilities);
    } catch (error) {
      this.setState(MCPConnectionState.ERROR);
      logger.error(`Failed to connect to MCP server ${this.config.name}:`, error);
      throw error;
    }
  }

  private async connectProcess(): Promise<void> {
    if (!this.config.command) {
      throw new Error('Process command not specified');
    }

    this.process = spawn(this.config.command, this.config.args || [], {
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout?.on('data', (data) => {
      this.handleMessage(data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      logger.error(`MCP server error: ${data.toString()}`);
    });

    this.process.on('error', (error) => {
      logger.error(`MCP process error:`, error);
      this.setState(MCPConnectionState.ERROR);
      this.emit('error', error);
    });

    this.process.on('exit', (code, signal) => {
      logger.info(`MCP process exited with code ${code} and signal ${signal}`);
      this.setState(MCPConnectionState.DISCONNECTED);
      this.emit('disconnected');
    });
  }

  private async connectHTTP(): Promise<void> {
    // HTTP/WebSocket connection implementation
    // This would connect to a remote MCP server
    throw new Error('HTTP connection not yet implemented');
  }

  private async initialize(): Promise<void> {
    const response = await this.request({
      method: 'initialize',
      params: {
        protocolVersion: '1.0.0',
        clientInfo: {
          name: 'ccf-planner',
          version: '1.0.0',
        },
      },
    });

    if (response.error) {
      throw new Error(`Initialization failed: ${response.error.message}`);
    }

    this.capabilities = response.result;
  }

  async request<T = any>(request: MCPRequest): Promise<MCPResponse<T>> {
    if (this.state !== MCPConnectionState.CONNECTED && request.method !== 'initialize') {
      throw new Error('Not connected to MCP server');
    }

    // Check circuit breaker
    if (!this.circuitBreakerState.canExecute()) {
      throw new Error('Circuit breaker is open - too many failures');
    }

    const requestId = uuidv4();
    const message = {
      jsonrpc: '2.0',
      id: requestId,
      method: request.method,
      params: request.params,
    };

    return exponentialBackoff(
      async () => {
        return new Promise<MCPResponse<T>>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.requestQueue.delete(requestId);
            this.circuitBreakerState.recordFailure();
            reject(new Error('Request timeout'));
          }, request.timeout || this.config.timeout || 30000);

          this.requestQueue.set(requestId, (response) => {
            clearTimeout(timeout);
            this.requestQueue.delete(requestId);
            
            if (response.error) {
              this.circuitBreakerState.recordFailure();
              reject(response.error);
            } else {
              this.circuitBreakerState.recordSuccess();
              resolve(response);
            }
          });

          this.sendMessage(message);
        });
      },
      this.retryPolicy
    );
  }

  private sendMessage(message: any): void {
    if (this.process?.stdin) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    } else {
      throw new Error('No connection available');
    }
  }

  private handleMessage(data: string): void {
    try {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        
        const message = JSON.parse(line);
        if (message.id && this.requestQueue.has(message.id)) {
          const callback = this.requestQueue.get(message.id);
          callback?.({
            result: message.result,
            error: message.error,
          });
        } else if (message.method) {
          // Handle notifications
          this.emit('notification', message);
        }
      }
    } catch (error) {
      logger.error('Failed to parse MCP message:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    this.setState(MCPConnectionState.DISCONNECTED);
    this.requestQueue.clear();
  }

  private setState(state: MCPConnectionState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  getState(): MCPConnectionState {
    return this.state;
  }

  getCapabilities(): MCPCapabilities | undefined {
    return this.capabilities;
  }

  isConnected(): boolean {
    return this.state === MCPConnectionState.CONNECTED;
  }
}