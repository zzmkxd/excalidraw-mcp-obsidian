import type { ToolHandler, HandlerContext } from './context.js';

const registry = new Map<string, ToolHandler>();

export function registerHandler(name: string, handler: ToolHandler): void {
  registry.set(name, handler);
}

export function dispatch(name: string): ToolHandler | undefined {
  return registry.get(name);
}

export { HandlerContext, ToolHandler };
