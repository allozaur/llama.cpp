/**
 * permissionsStore - Permission rules for tool calls
 *
 * Owns the rules that decide which tool calls run without asking, which ask
 * and which are refused: rules kept for good (persisted to localStorage,
 * everywhere or limited to a working folder) and rules for one conversation
 * (in memory until the app reloads). The agentic loop's permission gate
 * asks it before every tool call.
 */

import {
	ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY,
	PERMISSION_RULES_LOCALSTORAGE_KEY
} from '#lib/constants/index.ts';
import { PermissionEffect } from '#lib/enums/index.ts';
import type { PermissionCheck, PermissionRule, PermissionVerdict } from '#lib/types/index.ts';
import { evaluatePermission, isToolDenied } from '#lib/utils/permission-rules.ts';
import { browser } from '$app/env';
import { SvelteMap } from 'svelte/reactivity';

type NewRule = Omit<PermissionRule, 'createdAt' | 'id'>;

class PermissionsStore {
	private _rules = $state<PermissionRule[]>([]);
	private sessionRules = new SvelteMap<string, PermissionRule[]>();

	/** The rules kept for good, oldest first. */
	get rules(): readonly PermissionRule[] {
		return this._rules;
	}

	/** Keep rules for good. A rule equal to one already kept is not added twice. */
	addRules(rules: NewRule[]): void {
		const fresh = rules.filter((rule) => !this._rules.some((kept) => sameRule(kept, rule)));

		if (fresh.length === 0) return;

		this._rules = [...this._rules, ...fresh.map(createRule)];
		this.persist();
	}

	/** Keep rules for one conversation, until the app reloads. */
	addSessionRules(conversationId: string, rules: NewRule[]): void {
		const kept = this.sessionRules.get(conversationId) ?? [];

		this.sessionRules.set(conversationId, [
			...kept,
			...rules.filter((rule) => !kept.some((k) => sameRule(k, rule))).map(createRule)
		]);
	}

	/** Allow every call of a tool, everywhere. */
	allowTool(key: string): void {
		this.addRules([{ effect: PermissionEffect.ALLOW, tool: key }]);
	}

	allowTools(keys: string[]): void {
		this.addRules(keys.map((tool) => ({ effect: PermissionEffect.ALLOW, tool })));
	}

	/** Decide a tool call from the kept rules and the conversation's own. */
	check(check: PermissionCheck, conversationId: string): PermissionVerdict {
		return evaluatePermission(check, [
			...this._rules,
			...(this.sessionRules.get(conversationId) ?? [])
		]);
	}

	clearSession(conversationId: string): void {
		this.sessionRules.delete(conversationId);
	}

	/** Whether a tool is allowed everywhere, for every call. */
	hasTool(key: string): boolean {
		return this._rules.some((rule) => isToolWideAllow(rule, key));
	}

	/**
	 * Load the kept rules, and turn the tools allowed for good before rules
	 * existed into rules. Called by initStores() after migrations have run.
	 */
	initialize(): void {
		// browser-only init: skip on SSR to avoid localStorage side effects
		if (!browser) return;

		try {
			const stored = localStorage.getItem(PERMISSION_RULES_LOCALSTORAGE_KEY);

			if (stored) {
				this._rules = (JSON.parse(stored) as PermissionRule[]).filter(isRule);
			}

			const legacy = localStorage.getItem(ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY);

			if (legacy) {
				const keys = (JSON.parse(legacy) as unknown[]).filter(
					(key): key is string => typeof key === 'string'
				);

				this.allowTools(keys);
				this.persist();
				localStorage.removeItem(ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY);
			}
		} catch (err) {
			console.error(
				`Failed to load permission rules from localStorage ("${PERMISSION_RULES_LOCALSTORAGE_KEY}"):`,
				err
			);
		}
	}

	/** Whether rules refuse a tool outright here, so it is not offered to the model. */
	isToolDenied(key: string, cwd?: string): boolean {
		return isToolDenied(key, this._rules, cwd);
	}

	removeRule(id: string): void {
		this._rules = this._rules.filter((rule) => rule.id !== id);
		this.persist();
	}

	/** Stop allowing every call of a tool everywhere. Narrower rules stay. */
	revokeTool(key: string): void {
		this._rules = this._rules.filter((rule) => !isToolWideAllow(rule, key));
		this.persist();
	}

	private persist(): void {
		try {
			localStorage.setItem(PERMISSION_RULES_LOCALSTORAGE_KEY, JSON.stringify(this._rules));
		} catch (err) {
			console.error(
				`Failed to persist to localStorage ("${PERMISSION_RULES_LOCALSTORAGE_KEY}"):`,
				err
			);
		}
	}
}

function createRule(rule: NewRule): PermissionRule {
	return { ...rule, createdAt: Date.now(), id: crypto.randomUUID() };
}

function isToolWideAllow(rule: PermissionRule, key: string): boolean {
	return rule.tool === key && rule.effect === PermissionEffect.ALLOW && !rule.pattern && !rule.cwd;
}

function isRule(value: unknown): value is PermissionRule {
	const rule = value as PermissionRule;

	return (
		typeof rule?.id === 'string' &&
		typeof rule.tool === 'string' &&
		Object.values(PermissionEffect).includes(rule.effect)
	);
}

function sameRule(a: NewRule, b: NewRule): boolean {
	return a.tool === b.tool && a.effect === b.effect && a.pattern === b.pattern && a.cwd === b.cwd;
}

export const permissionsStore = new PermissionsStore();
