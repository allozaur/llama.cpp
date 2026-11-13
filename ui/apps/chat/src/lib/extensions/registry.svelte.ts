/**
 * extensions - The extension registry
 *
 * Knows every extension the app was composed with, loads and activates the
 * ones that are switched on, and holds what they contribute to each extension
 * point. The core reads contributions from here and never imports an
 * extension's code; switching an extension off removes its contributions.
 */

import type {
	Extension,
	ExtensionContext,
	ExtensionManifest,
	ExtensionPoint,
	ExtensionPoints,
	ExtensionState,
	ExtensionStatus
} from './types';
import { browser } from '$app/environment';
import { EXTENSIONS_LOCALSTORAGE_KEY } from '$lib/constants';
import { SvelteMap } from 'svelte/reactivity';

interface Contribution {
	owner: string;
	point: ExtensionPoint;
	value: unknown;
}

type Cleanup = () => void | Promise<void>;

class ExtensionRegistry {
	// the user's explicit on/off choices; an extension without one follows its manifest
	private _choices = new SvelteMap<string, boolean>();
	private _contributions = $state.raw<Contribution[]>([]);
	private _errors = new SvelteMap<string, string>();
	private _manifests = $state.raw<ExtensionManifest[]>([]);
	private _states = new SvelteMap<string, ExtensionState>();
	private choicesLoaded = false;
	// bookkeeping, deliberately not reactive
	private cleanups: Record<string, Cleanup[]> = {};
	// one chain per extension, so switching it on and off in a hurry stays in order
	private queues: Record<string, Promise<void>> = {};
	private storageKey: string | null;

	/** Every known extension with its current state, in registration order. */
	get extensions(): ExtensionStatus[] {
		return this._manifests.map((manifest) => ({
			description: manifest.description,
			enabled: this.isEnabled(manifest.id),
			error: this._errors.get(manifest.id) ?? null,
			id: manifest.id,
			name: manifest.name,
			state: this._states.get(manifest.id) ?? 'inactive'
		}));
	}

	/** Activate every extension that is switched on. Called once at startup; resolves when all settled. */
	async activateEnabled(): Promise<void> {
		this.loadChoices();

		await Promise.all(
			this._manifests
				.filter((manifest) => this.isEnabled(manifest.id))
				.map((manifest) => this.enqueue(manifest.id, () => this.activate(manifest)))
		);
	}

	/**
	 * @param options.storageKey - Where the on/off choices are kept in localStorage.
	 *   Null keeps them in memory only, for a registry that is not the app's.
	 */
	constructor(options: { storageKey?: string | null } = {}) {
		this.storageKey =
			options.storageKey === undefined ? EXTENSIONS_LOCALSTORAGE_KEY : options.storageKey;
	}

	/** What the active extensions contribute to a point, in activation order. Reactive. */
	contributions<P extends ExtensionPoint>(point: P): ExtensionPoints[P][] {
		const result: ExtensionPoints[P][] = [];

		for (const contribution of this._contributions) {
			if (contribution.point === point) result.push(contribution.value as ExtensionPoints[P]);
		}

		return result;
	}

	/** True while the extension is running: switched on and activated without failing. */
	isActive(id: string): boolean {
		return this._states.get(id) === 'active';
	}

	isEnabled(id: string): boolean {
		const manifest = this._manifests.find((m) => m.id === id);

		if (!manifest) return false;

		return this._choices.get(id) ?? !manifest.disabledByDefault;
	}

	/** Make an extension known. Its code is not loaded until it is activated. */
	register(manifest: ExtensionManifest): void {
		if (this._manifests.some((m) => m.id === manifest.id)) {
			throw new Error(`Extension "${manifest.id}" is already registered`);
		}

		// read here rather than on first use, so a known extension always shows its stored choice
		this.loadChoices();
		this._manifests = [...this._manifests, manifest];
	}

	/** Switch an extension on or off, remember the choice, and resolve once it took effect. */
	async setEnabled(id: string, enabled: boolean): Promise<void> {
		const manifest = this._manifests.find((m) => m.id === id);

		if (!manifest) return;

		this.loadChoices();
		this._choices.set(id, enabled);
		this.persistChoices();

		await this.enqueue(id, () => (enabled ? this.activate(manifest) : this.deactivate(id)));
	}

	private async activate(manifest: ExtensionManifest): Promise<void> {
		const { id } = manifest;

		if (this._states.get(id) === 'active') return;

		this._errors.delete(id);
		this._states.set(id, 'activating');

		const cleanups: Cleanup[] = [];

		let live = true;

		this.cleanups[id] = cleanups;

		const ctx: ExtensionContext = {
			contribute: (point, value) => {
				if (!live) throw new Error(`Extension "${id}" is not active`);

				this._contributions = [...this._contributions, { owner: id, point, value }];
			},
			onDeactivate: (cleanup) => {
				cleanups.push(cleanup);
			}
		};

		cleanups.push(() => {
			live = false;
		});

		try {
			const module: { default: Extension } = await manifest.load();

			await module.default.activate(ctx);
			this._states.set(id, 'active');
		} catch (error) {
			console.error(`[extensions] "${id}" failed to activate:`, error);

			await this.deactivate(id);
			this._errors.set(id, error instanceof Error ? error.message : String(error));
			this._states.set(id, 'failed');
		}
	}

	private async deactivate(id: string): Promise<void> {
		// contributions go first, so nothing reaches for an extension that is tearing down
		this._contributions = this._contributions.filter((c) => c.owner !== id);

		const cleanups = this.cleanups[id] ?? [];

		delete this.cleanups[id];

		for (const cleanup of cleanups.reverse()) {
			try {
				await cleanup();
			} catch (error) {
				console.error(`[extensions] "${id}" failed to clean up:`, error);
			}
		}

		this._errors.delete(id);
		this._states.set(id, 'inactive');
	}

	private enqueue(id: string, task: () => Promise<void>): Promise<void> {
		const next = (this.queues[id] ?? Promise.resolve()).then(task);

		this.queues[id] = next;

		return next;
	}

	private loadChoices(): void {
		if (this.choicesLoaded || !browser || !this.storageKey) return;

		this.choicesLoaded = true;

		try {
			const stored = localStorage.getItem(this.storageKey);

			if (!stored) return;

			const parsed: unknown = JSON.parse(stored);

			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

			for (const [id, enabled] of Object.entries(parsed)) {
				if (typeof enabled === 'boolean') this._choices.set(id, enabled);
			}
		} catch (error) {
			console.error('[extensions] Failed to load the on/off choices from localStorage:', error);
		}
	}

	private persistChoices(): void {
		if (!browser || !this.storageKey) return;

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(Object.fromEntries(this._choices)));
		} catch {
			// ignore storage errors
		}
	}
}

export { ExtensionRegistry };

export const extensions = new ExtensionRegistry();
