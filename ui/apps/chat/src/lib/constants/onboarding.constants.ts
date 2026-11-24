import { RECOMMENDED_MCP_SERVERS } from './recommended-mcp-servers.constants';
import { AgenticSectionType } from '#lib/enums/agentic.enums.ts';
import { OnboardingStep } from '#lib/enums/onboarding.enums.ts';
import { BuiltInTool } from '#lib/enums/tools.enums.ts';
import type { AgenticSection } from '#lib/types/index.ts';

/** Every onboarding step, in the order the flow shows them. */
export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
	OnboardingStep.INTRO_CHAT,
	OnboardingStep.INTRO_TOOLS,
	OnboardingStep.INTRO_VOICE,
	OnboardingStep.CONNECTION,
	OnboardingStep.MODEL,
	OnboardingStep.VOICE,
	OnboardingStep.POWER_UPS,
	OnboardingStep.DONE
];

/** The slides that say what the app can do; "Skip intro" jumps past them. */
export const ONBOARDING_INTRO_STEPS: OnboardingStep[] = [
	OnboardingStep.INTRO_CHAT,
	OnboardingStep.INTRO_TOOLS,
	OnboardingStep.INTRO_VOICE
];

/** Heading and supporting line of each step. An intro slide is its heading alone. */
export const ONBOARDING_STEP_COPY: Record<OnboardingStep, { description?: string; title: string }> =
	{
		[OnboardingStep.CONNECTION]: {
			description: 'This server asks for an API key. It is kept in this browser only.',
			title: 'Connect to the server'
		},
		[OnboardingStep.DONE]: {
			description: 'You can open this guide again from Settings, under Data.',
			title: 'You are all set'
		},
		[OnboardingStep.INTRO_CHAT]: {
			title: 'Chat with models that run on your own machine, privately.'
		},
		[OnboardingStep.INTRO_TOOLS]: {
			title: 'Give the model tools: files, shell, web search and MCP servers.'
		},
		[OnboardingStep.INTRO_VOICE]: {
			title: 'Talk to it: send voice messages or dictate your text.'
		},
		[OnboardingStep.MODEL]: {
			description: 'Pick a first model for the server to download, or do it later.',
			title: 'Get a model'
		},
		[OnboardingStep.POWER_UPS]: {
			description:
				'MCP servers give the model more tools. Turn on the ones you want, you can change them later.',
			title: 'Power-ups'
		},
		[OnboardingStep.VOICE]: {
			description:
				'None of your models takes audio. Add one that does to dictate, send voice messages and use the coming voice mode.',
			title: 'Add a model that hears'
		}
	};

/** First messages offered on the last step. */
export const ONBOARDING_EXAMPLE_PROMPTS: string[] = [
	'What can you help me with?',
	'Explain how a language model works in simple words.',
	'Write a short poem about running AI on my own computer.'
];

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
