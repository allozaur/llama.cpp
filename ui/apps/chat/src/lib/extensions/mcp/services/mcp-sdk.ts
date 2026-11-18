/**
 * The MCP SDK's runtime code, as one module MCPService loads on demand
 *
 * The SDK with its zod schemas and JSON Schema validator is the heaviest
 * part of the MCP extension, and the extension is on by default. Imported
 * only through MCPService.loadSdk(), so it stays out of the extension's chunk
 * and a user without MCP servers never downloads it. Everything else
 * imports the SDK for types only.
 */

export {
	Client,
	SdkError,
	SdkErrorCode,
	SdkHttpError,
	SSEClientTransport,
	StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';
export { WebSocketClientTransport } from './mcp-websocket-transport';
