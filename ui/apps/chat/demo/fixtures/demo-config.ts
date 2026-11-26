/** Shared fixture data for demo recordings (used by both Node and the browser seed). */

export const DEMO_MCP_PORT = 8765;

export interface DemoMcpPrompt {
	name: string;
	title: string;
	description: string;
	/** The prompt's text. `{name}` stands for the value of the argument of that name. */
	text: string;
	arguments?: { name: string; description: string }[];
}

export interface DemoMcpServer {
	id: string;
	name: string;
	title: string;
	tools: { name: string; description: string; result: string }[];
	prompts?: DemoMcpPrompt[];
}

export const DEMO_MCP_SERVERS: DemoMcpServer[] = [
	{
		id: 'weather',
		name: 'weather',
		title: 'Weather',
		tools: [
			{
				description: 'Get the weather forecast for a city',
				name: 'get_forecast',
				result: 'Sunny, 22°C'
			},
			{
				description: 'List active weather alerts for a region',
				name: 'get_alerts',
				result: 'No active alerts'
			}
		]
	},
	{
		id: 'notes',
		name: 'notes',
		prompts: [
			{
				description: 'Turn rough notes into a short summary',
				name: 'summarize_notes',
				text: 'Summarize these notes in three bullet points. Keep the names and dates.',
				title: 'Summarize notes'
			},
			{
				arguments: [{ description: 'What the meeting is about', name: 'topic' }],
				description: 'An agenda for a meeting on a topic',
				name: 'meeting_agenda',
				text: 'Write a one-page agenda for a meeting about {topic}, with a time for each item.',
				title: 'Meeting agenda'
			}
		],
		title: 'Notes',
		tools: [
			{ description: 'Search notes by keyword', name: 'search_notes', result: 'No notes found' },
			{ description: 'Create a new note', name: 'create_note', result: 'Note created' },
			{ description: 'List recent notes', name: 'list_notes', result: 'No notes yet' }
		]
	}
];

/** `mcpServers` setting value pointing the UI at the fixture servers. */
export function demoMcpServerSettings(): object[] {
	return DEMO_MCP_SERVERS.map((server) => ({
		enabled: true,
		id: `demo-${server.id}`,
		url: `http://localhost:${DEMO_MCP_PORT}/${server.id}/mcp`
	}));
}
