import { RetryPolicy } from './types';

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let lastError: any;
  let delay = policy.initialDelay;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === policy.maxRetries) {
        throw error;
      }

      await sleep(Math.min(delay, policy.maxDelay));
      delay *= policy.backoffMultiplier;
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime?: number;
  state: 'closed' | 'open' | 'half-open';
}

export function circuitBreaker(
  threshold = 5,
  resetTimeout = 60000
): {
  canExecute: () => boolean;
  recordSuccess: () => void;
  recordFailure: () => void;
  getState: () => CircuitBreakerState;
} {
  const state: CircuitBreakerState = {
    failureCount: 0,
    state: 'closed',
  };

  return {
    canExecute(): boolean {
      if (state.state === 'closed') {
        return true;
      }

      if (state.state === 'open') {
        const now = Date.now();
        if (state.lastFailureTime && now - state.lastFailureTime > resetTimeout) {
          state.state = 'half-open';
          return true;
        }
        return false;
      }

      // half-open
      return true;
    },

    recordSuccess(): void {
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failureCount = 0;
      }
    },

    recordFailure(): void {
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.failureCount >= threshold) {
        state.state = 'open';
      }
    },

    getState(): CircuitBreakerState {
      return { ...state };
    },
  };
}

export function validateMCPResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    'jsonrpc' in response &&
    response.jsonrpc === '2.0'
  );
}

export function createMCPError(code: number, message: string, data?: any) {
  return {
    code,
    message,
    data,
  };
}

export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
  TIMEOUT: -32001,
  CONNECTION_FAILED: -32002,
  CIRCUIT_BREAKER_OPEN: -32003,
} as const;