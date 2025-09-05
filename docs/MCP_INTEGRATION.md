# MCP Integration Guide

## Overview

This document describes the Model Context Protocol (MCP) integration in the CCF Planner application. MCP enables communication with external AI services and tools through a standardized protocol.

## Architecture

### Backend Components

```
src/backend/src/
├── services/mcp/
│   ├── index.ts           # Main exports
│   ├── MCPClient.ts       # Low-level MCP client
│   ├── MCPService.ts      # Service layer singleton
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
├── routes/mcp.ts          # REST API endpoints
└── config/mcp.config.ts  # MCP configuration
```

### Frontend Components

```
src/frontend/src/
├── lib/mcp/
│   └── mcpClient.ts       # API client for MCP endpoints
├── hooks/
│   └── useMCP.ts          # React hooks for MCP
└── components/mcp/
    └── MCPConnectionStatus.tsx  # UI components
```

## Features

### 1. Connection Management
- Auto-connect to configured MCP servers on startup
- Manual connect/disconnect functionality
- Connection health monitoring
- Graceful shutdown handling

### 2. Error Handling
- Exponential backoff retry mechanism
- Circuit breaker pattern for fault tolerance
- Comprehensive error logging
- User-friendly error messages

### 3. Tool Execution
- List available tools from connected servers
- Execute tools with type-safe parameters
- Timeout handling for long-running operations
- Result caching and validation

### 4. Resource Management
- List and access MCP resources
- Resource URI validation
- MIME type detection
- Streaming support for large resources

## Configuration

### Environment Variables

```bash
# .env
MCP_FILESYSTEM_PATHS=/path/to/allowed/dirs
MCP_SERVERS='[{"name":"custom","command":"npx","args":["@custom/mcp-server"]}]'
JWT_SECRET=your-secret-key
```

### Server Configuration

Edit `src/backend/src/config/mcp.config.ts`:

```typescript
export const mcpConfig: MCPConfig = {
  servers: [
    {
      name: 'claude-flow',
      command: 'npx',
      args: ['claude-flow@alpha', 'mcp', 'start'],
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      autoConnect: true,
    },
  ],
  defaultTimeout: 30000,
  enableAutoConnect: true,
  enableHealthCheck: true,
  healthCheckInterval: 60000,
};
```

## API Endpoints

### Connection Management

```http
GET /api/v1/mcp/connections
GET /api/v1/mcp/connections/:serverName
POST /api/v1/mcp/connections/:serverName/connect
POST /api/v1/mcp/connections/:serverName/disconnect
GET /api/v1/mcp/health
```

### Tools

```http
GET /api/v1/mcp/tools?server=claude-flow
POST /api/v1/mcp/tools/call
{
  "server": "claude-flow",
  "tool": "swarm_init",
  "arguments": {
    "topology": "mesh"
  }
}
```

### Resources

```http
GET /api/v1/mcp/resources?server=filesystem
POST /api/v1/mcp/resources/get
{
  "server": "filesystem",
  "uri": "file:///path/to/resource"
}
```

## Frontend Usage

### React Hooks

```tsx
import { useMCPConnections, useMCPTools } from '@/hooks/useMCP';

function MyComponent() {
  const { connections, connect, disconnect } = useMCPConnections();
  const { tools, callTool } = useMCPTools('claude-flow');

  const handleToolCall = async () => {
    const result = await callTool(
      'claude-flow',
      'swarm_init',
      { topology: 'mesh' }
    );
    console.log(result);
  };

  return (
    // Your UI here
  );
}
```

### Connection Status Component

```tsx
import { MCPConnectionStatus } from '@/components/mcp/MCPConnectionStatus';

function Dashboard() {
  return (
    <div>
      <MCPConnectionStatus />
      {/* Other dashboard components */}
    </div>
  );
}
```

## Error Handling

The MCP integration includes multiple layers of error handling:

1. **Circuit Breaker**: Prevents cascading failures
2. **Exponential Backoff**: Automatic retry with increasing delays
3. **Timeout Management**: Configurable timeouts per operation
4. **Graceful Degradation**: Fallback behavior when MCP is unavailable

## Security Considerations

1. **Authentication**: All MCP endpoints require JWT authentication
2. **Rate Limiting**: API endpoints are rate-limited
3. **Input Validation**: All inputs are validated before processing
4. **Secure Communication**: HTTPS required in production
5. **Access Control**: Role-based access to MCP features

## Testing

### Unit Tests

```bash
cd src/backend
npm test -- --grep MCP
```

### Integration Tests

```bash
# Start test MCP server
npx @modelcontextprotocol/test-server

# Run integration tests
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check if MCP server is installed and accessible
2. **Timeout Errors**: Increase timeout in configuration
3. **Circuit Breaker Open**: Too many failures, wait for reset
4. **Authentication Error**: Ensure valid JWT token is provided

### Debug Mode

Enable debug logging:

```bash
DEBUG=mcp:* npm run dev
```

## Best Practices

1. **Connection Pooling**: Reuse connections when possible
2. **Error Recovery**: Implement proper error handling in UI
3. **Performance**: Cache tool/resource listings
4. **Monitoring**: Track MCP metrics in production
5. **Documentation**: Keep tool descriptions up to date

## Future Enhancements

- WebSocket support for real-time updates
- MCP server discovery
- Advanced caching strategies
- Metric collection and visualization
- Plugin system for custom MCP servers