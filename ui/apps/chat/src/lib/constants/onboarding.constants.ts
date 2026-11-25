import { RECOMMENDED_MCP_SERVERS } from './recommended-mcp-servers.constants';
import { CalendarDays, FolderOpen, Globe, Lightbulb, MessageCircle, PenLine } from '@lucide/svelte';
import { AgenticSectionType } from '#lib/enums/agentic.enums.ts';
import { OnboardingStep } from '#lib/enums/onboarding.enums.ts';
import { BuiltInTool } from '#lib/enums/tools.enums.ts';
import type { AgenticSection } from '#lib/types/index.ts';
import type { Component } from 'svelte';

/** Every onboarding step, in the order the flow shows them. */
export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
	OnboardingStep.INTRO_CHAT,
	OnboardingStep.INTRO_TOOLS,
	OnboardingStep.INTRO_VOICE,
	OnboardingStep.CONNECTION,
	OnboardingStep.MODEL,
	OnboardingStep.VOICE,
	OnboardingStep.POWER_UPS,
	OnboardingStep.IMPORT,
	OnboardingStep.DONE
];

/** The slides that say what the app can do; "Skip intro" jumps past them. */
export const ONBOARDING_INTRO_STEPS: OnboardingStep[] = [
	OnboardingStep.INTRO_CHAT,
	OnboardingStep.INTRO_TOOLS,
	OnboardingStep.INTRO_VOICE
];

/** What the app says on each step, as a message in the onboarding's conversation. */
export const ONBOARDING_STEP_COPY: Record<OnboardingStep, string> = {
	[OnboardingStep.CONNECTION]:
		'This server asks for an API key. Enter it and I will connect. The key stays in this browser.',
	[OnboardingStep.DONE]:
		'You are all set. Start with a simple task to see how it works, or write your own.',
	[OnboardingStep.IMPORT]:
		'Used Claude Code on this machine? I can bring those chat sessions in. Pick its sessions folder, or do it later in Settings.',
	[OnboardingStep.INTRO_CHAT]:
		'Here you chat with models that run on your own machine, privately. A quick look at what that means, then we set things up.',
	[OnboardingStep.INTRO_TOOLS]:
		'Give the model tools and it can do things: read and edit files, run shell commands, search the web, or use any MCP server.',
	[OnboardingStep.INTRO_VOICE]:
		'You can also talk to it: send a voice message or dictate your text.',
	[OnboardingStep.MODEL]:
		'The server has no models yet. Pick a first one to download, or do it later.',
	[OnboardingStep.POWER_UPS]:
		'Want more tools? These MCP servers add web search and docs. Turn on the ones you like, you can change them later.',
	[OnboardingStep.VOICE]:
		'None of your models takes audio. Add one that does and you can dictate, send voice messages and use the coming voice mode.'
};

/** What stands in for the user's answer when a setup step is passed without one. */
export const ONBOARDING_NO_ANSWER = 'Not now';

/** What a first task needs before it is offered. */
export interface OnboardingTask {
	icon: Component;
	id: string;
	label: string;
	prompt: string;
	/** Offered only with the server's file and shell tools. */
	needsServerTools?: boolean;
	/** Offered only with a web search MCP server added. */
	needsWebSearch?: boolean;
}

/** How many first tasks the last step shows. */
export const ONBOARDING_TASK_COUNT = 4;

/** First tasks, most telling first: the ones that use a tool show what the app can reach. */
export const ONBOARDING_TASKS: OnboardingTask[] = [
	{
		icon: FolderOpen,
		id: 'files',
		label: 'Look around my working folder',
		needsServerTools: true,
		prompt: 'List the files in your working folder and tell me what you see.'
	},
	{
		icon: Globe,
		id: 'search',
		label: 'Find the latest llama.cpp news',
		needsWebSearch: true,
		prompt: 'Search the web for the latest llama.cpp news and sum it up in a few points.'
	},
	{
		icon: CalendarDays,
		id: 'date',
		label: 'What day is it today?',
		prompt: 'What day is it today?'
	},
	{
		icon: Lightbulb,
		id: 'explain',
		label: 'Explain how a language model works',
		prompt: 'Explain how a language model works in simple words.'
	},
	{
		icon: MessageCircle,
		id: 'help',
		label: 'What can you help me with?',
		prompt: 'What can you help me with?'
	},
	{
		icon: PenLine,
		id: 'poem',
		label: 'Write a poem about local AI',
		prompt: 'Write a short poem about running AI on my own computer.'
	}
];

/** The recommended MCP server that brings web search. */
export const ONBOARDING_WEB_SEARCH_SERVER_ID = 'exa';

/** Recommended MCP servers a single switch can add: the ones that need no token. */
export const ONBOARDING_MCP_SERVERS = RECOMMENDED_MCP_SERVERS.filter(
	(server) => !server.needsAuthorization
);

/** Hugging Face tasks of embedding models: they take audio in the catalog but cannot transcribe. */
export const ONBOARDING_EMBEDDING_PIPELINE_TAGS: string[] = [
	'feature-extraction',
	'sentence-similarity'
];

/** Sample content of the intro slides. It only illustrates, nothing here is sent or run. */
export const ONBOARDING_SAMPLE = {
	answer:
		'Sure. Everything stays on this machine: the model runs here, and your chats are saved in this browser.',
	modelId: 'ggml-org/gemma-4-E4B-it-GGUF:Q4_0',
	question: 'Can you work without sending my data anywhere?',
	toolSections: [
		{
			content: '',
			toolArgs: JSON.stringify({ query: 'llama.cpp latest release notes' }),
			toolCallId: 'onboarding-search',
			toolName: 'web_search_exa',
			toolResult: [
				'Title: Releases - ggml-org/llama.cpp',
				'URL: https://github.com/ggml-org/llama.cpp/releases',
				'Published: N/A',
				'Author: ggml-org',
				'Highlights:',
				'Release notes and prebuilt binaries of llama.cpp.'
			].join('\n'),
			type: AgenticSectionType.TOOL_CALL
		},
		{
			content: '',
			toolArgs: JSON.stringify({ command: 'npm test' }),
			toolCallId: 'onboarding-shell',
			toolCwd: '~/projects/app',
			toolName: BuiltInTool.SERVER_EXEC_SHELL_COMMAND,
			toolResult: ' Test Files  2 passed (2)\n      Tests  5 passed (5)\n[exit code: 0]',
			type: AgenticSectionType.TOOL_CALL
		}
	] satisfies AgenticSection[],
	transcript: 'Remind me to water the plants tomorrow morning.',
	/** Input levels of the recording bar, 0..1. */
	voiceLevels: Array.from(
		{ length: 96 },
		(_, i) => 0.15 + 0.75 * Math.abs(Math.sin(i * 0.45) * Math.sin(i * 0.13))
	),
	voiceMs: 7000
};
