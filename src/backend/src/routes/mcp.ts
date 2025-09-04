import { Router, Request, Response } from 'express';
import { MCPService } from '../services/mcp/MCPService';
import { asyncHandler } from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const mcpService = MCPService.getInstance();

// List all MCP connections
router.get('/connections', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const connections = mcpService.getConnections();
  return res.json({
    success: true,
    data: connections,
  });
}));

// Get specific connection status
router.get('/connections/:serverName', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { serverName } = req.params;
  const connection = mcpService.getConnection(serverName);
  
  if (!connection) {
    return res.status(404).json({
      success: false,
      error: `Server ${serverName} not found`,
    });
  }

  return res.json({
    success: true,
    data: connection,
  });
}));

// Connect to a server
router.post('/connections/:serverName/connect', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { serverName } = req.params;
  
  await mcpService.connectServer(serverName);
  
  return res.json({
    success: true,
    message: `Connected to server ${serverName}`,
  });
}));

// Disconnect from a server
router.post('/connections/:serverName/disconnect', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { serverName } = req.params;
  
  await mcpService.disconnectServer(serverName);
  
  return res.json({
    success: true,
    message: `Disconnected from server ${serverName}`,
  });
}));

// List available tools
router.get('/tools', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { server } = req.query;
  const tools = await mcpService.listTools(server as string);
  
  return res.json({
    success: true,
    data: tools,
  });
}));

// Call a tool
router.post('/tools/call', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { server, tool, arguments: args, timeout } = req.body;

  if (!server || !tool) {
    return res.status(400).json({
      success: false,
      error: 'Server and tool name are required',
    });
  }

  const result = await mcpService.callTool(server, tool, args, { timeout });

  if (result.error) {
    return res.status(500).json({
      success: false,
      error: result.error,
    });
  }

  return res.json({
    success: true,
    data: result.result,
    metadata: result.metadata,
  });
}));

// List available resources
router.get('/resources', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { server } = req.query;
  const resources = await mcpService.listResources(server as string);
  
  return res.json({
    success: true,
    data: resources,
  });
}));

// Get a resource
router.post('/resources/get', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { server, uri, timeout } = req.body;

  if (!server || !uri) {
    return res.status(400).json({
      success: false,
      error: 'Server and resource URI are required',
    });
  }

  const result = await mcpService.getResource(server, uri, { timeout });

  if (result.error) {
    return res.status(500).json({
      success: false,
      error: result.error,
    });
  }

  return res.json({
    success: true,
    data: result.result,
    metadata: result.metadata,
  });
}));

// Health check for all MCP connections
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const connections = mcpService.getConnections();
  const health = {
    healthy: connections.every(c => c.state === 'connected'),
    connections: connections.map(c => ({
      server: c.serverId,
      state: c.state,
      lastConnected: c.lastConnected,
      error: c.error,
    })),
  };

  const status = health.healthy ? 200 : 503;
  res.status(status).json(health);
}));

export default router;
