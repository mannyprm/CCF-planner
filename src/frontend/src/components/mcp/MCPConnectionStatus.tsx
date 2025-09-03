import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { useMCPConnections } from '@/hooks/useMCP';

export function MCPConnectionStatus() {
  const { connections, loading, error, connect, disconnect } = useMCPConnections();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MCP Connections</CardTitle>
          <CardDescription>Managing server connections...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MCP Connections</CardTitle>
          <CardDescription>Error loading connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Connections</CardTitle>
        <CardDescription>
          Manage connections to Model Context Protocol servers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {connection.state === 'connected' ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : connection.state === 'connecting' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : connection.state === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">{connection.serverId}</div>
                  {connection.error && (
                    <div className="text-sm text-destructive">{connection.error}</div>
                  )}
                  {connection.lastConnected && (
                    <div className="text-sm text-muted-foreground">
                      Last connected: {new Date(connection.lastConnected).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    connection.state === 'connected'
                      ? 'default'
                      : connection.state === 'error'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {connection.state}
                </Badge>
                {connection.state === 'connected' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => disconnect(connection.serverId)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connect(connection.serverId)}
                    disabled={connection.state === 'connecting'}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ))}
          {connections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No MCP servers configured
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}