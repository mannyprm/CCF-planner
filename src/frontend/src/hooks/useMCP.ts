import { useState, useEffect, useCallback } from 'react';
import { mcpClient, MCPConnection, MCPTool, MCPResource } from '@/lib/mcp/mcpClient';
import { useToast } from '@/hooks/use-toast';

export function useMCPConnections() {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getConnections();
      setConnections(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const connect = useCallback(async (serverName: string) => {
    try {
      await mcpClient.connect(serverName);
      await fetchConnections();
      toast({
        title: 'Connected',
        description: `Successfully connected to ${serverName}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      toast({
        title: 'Connection Failed',
        description: message,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchConnections, toast]);

  const disconnect = useCallback(async (serverName: string) => {
    try {
      await mcpClient.disconnect(serverName);
      await fetchConnections();
      toast({
        title: 'Disconnected',
        description: `Disconnected from ${serverName}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      toast({
        title: 'Disconnect Failed',
        description: message,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchConnections, toast]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    loading,
    error,
    refetch: fetchConnections,
    connect,
    disconnect,
  };
}

export function useMCPTools(serverName?: string) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        const data = await mcpClient.listTools(serverName);
        setTools(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch tools';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [serverName]);

  const callTool = useCallback(async (
    server: string,
    tool: string,
    args?: any,
    options?: { timeout?: number }
  ) => {
    return mcpClient.callTool({
      server,
      tool,
      arguments: args,
      timeout: options?.timeout,
    });
  }, []);

  return {
    tools,
    loading,
    error,
    callTool,
  };
}

export function useMCPResources(serverName?: string) {
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const data = await mcpClient.listResources(serverName);
        setResources(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch resources';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [serverName]);

  const getResource = useCallback(async (
    server: string,
    uri: string,
    options?: { timeout?: number }
  ) => {
    return mcpClient.getResource({
      server,
      uri,
      timeout: options?.timeout,
    });
  }, []);

  return {
    resources,
    loading,
    error,
    getResource,
  };
}

export function useMCPHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.checkHealth();
      setHealth(data);
      setError(null);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check health';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    
    // Set up periodic health checks
    const interval = setInterval(checkHealth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    checkHealth,
  };
}