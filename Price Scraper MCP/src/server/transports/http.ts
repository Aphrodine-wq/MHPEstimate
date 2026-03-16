import express from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import pino from 'pino';

const logger = pino({ name: 'transport:http' });

export async function startHttpTransport(server: McpServer, port: number): Promise<void> {
  const app = express();
  app.use(express.json());

  // Store active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // New session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onclose = () => {
      const sid = (transport as unknown as { sessionId?: string }).sessionId;
      if (sid) transports.delete(sid);
    };

    await server.connect(transport);

    const sid = (transport as unknown as { sessionId?: string }).sessionId;
    if (sid) transports.set(sid, transport);

    await transport.handleRequest(req, res);
  });

  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      transports.delete(sessionId);
    } else {
      res.status(400).json({ error: 'Invalid or missing session ID' });
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http' });
  });

  app.listen(port, () => {
    logger.info({ port }, `MCP HTTP server listening on port ${port}`);
  });
}
