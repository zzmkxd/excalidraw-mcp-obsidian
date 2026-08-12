#!/usr/bin/env node

// Disable colors to prevent ANSI color codes from breaking JSON parsing
process.env.NODE_DISABLE_COLORS = '1';
process.env.NO_COLOR = '1';

import { fileURLToPath } from "url";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger.js';
import { getListedTools, dispatch } from './tools/index.js';
import {
  createElementLocal,
  updateElementLocal,
  deleteElementLocal,
  batchCreateElementsLocal,
  getElementLocal,
  clearAllLocal,
} from './tools/local-crud.js';
import type { HandlerContext, SceneState } from './tools/context.js';
import { loadConfig, canvasConfig } from './config/canvas-config.js';

// Load environment variables
dotenv.config();

// Load persisted canvas config
loadConfig();

// In-memory scene state
const sceneState: SceneState = {
  theme: 'light',
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedElements: new Set(),
  groups: new Map(),
  fontFamily: canvasConfig.fontFamily,
  activePresetName: null,
};

// Persist appState across import→modify→export round-trips
const importedAppState: { current: Record<string, any> | null } = { current: null };

// Shared handler context
const ctx: HandlerContext = {
  sceneState,
  importedAppState,
  createElementLocal,
  updateElementLocal,
  deleteElementLocal,
  batchCreateElementsLocal,
  getElementLocal,
  clearAllLocal,
};

// Initialize MCP server
const server = new Server(
  {
    name: "mcp-excalidraw-server",
    version: "2.0.0",
    description: "Programmatic canvas toolkit for Excalidraw with file I/O, image export, and real-time sync"
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up request handler — dispatches to registered handler via Map
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    const { name, arguments: args } = request.params;
    logger.info(`Handling tool call: ${name}`);

    const handler = dispatch(name);
    if (!handler) throw new Error(`Unknown tool: ${name}`);

    return await handler(ctx, args);
  } catch (error) {
    logger.error(`Error handling tool call: ${(error as Error).message}`, { error });
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true
    };
  }
});

// Set up request handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  return { tools: getListedTools() };
});

// Start server — MCP stdio transport only
async function runServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Excalidraw MCP server running on stdio');

    process.stdin.resume();
  } catch (error) {
    logger.error('Error starting server:', error);
    process.stderr.write(`Failed to start MCP server: ${(error as Error).message}\n${(error as Error).stack}\n`);
    process.exit(1);
  }
}

// Add global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.stderr.write(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}\n`);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
  logger.error('Unhandled promise rejection:', reason);
  process.stderr.write(`UNHANDLED REJECTION: ${reason}\n`);
  setTimeout(() => process.exit(1), 1000);
});

// For testing and debugging purposes
if (process.env.DEBUG === 'true') {
  logger.debug('Debug mode enabled');
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function resolveEntrypointPath(filePath: string | undefined): string | null {
  if (!filePath) return null;
  try {
    return fs.realpathSync(filePath);
  } catch (error) {
    const code = getErrorCode(error);
    if (code !== 'ENOENT') {
      logger.warn(`fs.realpathSync failed for "${filePath}", falling back to path.resolve.`, {
        code,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return path.resolve(filePath);
  }
}

// Start the server if this file is run directly
if (resolveEntrypointPath(fileURLToPath(import.meta.url)) === resolveEntrypointPath(process.argv[1])) {
  runServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default runServer;
