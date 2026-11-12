/**
 * What a server card reports: the pill word, the sentence under it and the
 * state the card's controls hang off.
 *
 * The words carry the weight here. A failed channel and an unreachable server
 * need different repairs, and the transport's own sentence - a refused
 * passcode, a tracker nobody answered - is the one the user can act on, so it
 * is reported as it came rather than folded into a generic label.
 */

import { ServerCardState, TunnelStatus } from '$lib/enums';

/** Everything the card knows about a server when it has to name its state. */
export interface ServerCardFacts {
	enabled: boolean;
	/** Models the listing reported. */
	modelCount: number;
	/** The listing's failure, empty while it answered or was never asked. */
	modelsError: string;
	modelsLoaded: boolean;
	modelsLoading: boolean;
	/** Whether the server is reached over a tunnel. */
	remote: boolean;
	tunnel: TunnelStatus;
	/** The tunnel's failure, empty while it never failed. */
	tunnelError: string;
}

export interface ServerCardStatus {
	/** Sentence under the pill; empty when the state needs none. */
	detail: string;
	/** Pill word; empty for a state the card does not report. */
	label: string;
	state: ServerCardState;
}

/** State a card reports for a server, with the words that state is shown in. */
export function serverCardStatusOf(facts: ServerCardFacts): ServerCardStatus {
	const {
		enabled,
		modelCount,
		modelsError,
		modelsLoaded,
		modelsLoading,
		remote,
		tunnel,
		tunnelError
	} = facts;
	const connecting = remote && tunnel === TunnelStatus.CONNECTING;
	const idle =
		remote && tunnel === TunnelStatus.IDLE && !modelsLoading && !modelsLoaded && !modelsError;
	const checking = enabled && !connecting && !idle && !modelsLoaded && !modelsError && !tunnelError;
	const online =
		enabled && modelsLoaded && !modelsError && (!remote || tunnel === TunnelStatus.CONNECTED);
	const offline = enabled && (tunnel === TunnelStatus.ERROR || (!idle && Boolean(modelsError)));

	if (connecting) {
		return {
			detail: 'Opening the tunnel to the host.',
			label: 'Connecting',
			state: ServerCardState.CONNECTING
		};
	}

	if (checking) {
		return {
			detail: remote
				? 'Asking the host for the models it serves.'
				: 'Asking the server for the models it serves.',
			label: 'Checking',
			state: ServerCardState.CHECKING
		};
	}

	if (online) {
		return {
			detail: '',
			label: modelCount === 1 ? '1 model' : `${modelCount} models`,
			state: ServerCardState.ONLINE
		};
	}

	if (offline) {
		// the channel failing is the one failure the user can act on: the code may
		// have expired, or the host may not be listening
		if (remote && tunnel === TunnelStatus.ERROR) {
			return { detail: tunnelError, label: 'Channel down', state: ServerCardState.CHANNEL_DOWN };
		}

		return { detail: modelsError, label: 'Unreachable', state: ServerCardState.UNREACHABLE };
	}

	if (idle) {
		return {
			detail: 'Paste the code the host prints, or press Connect.',
			label: 'Not connected',
			state: ServerCardState.IDLE
		};
	}

	return { detail: '', label: '', state: ServerCardState.NONE };
}
