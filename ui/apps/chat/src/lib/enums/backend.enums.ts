/**
 * Provider transport enums.
 *
 * A provider is one llama.cpp server the UI can talk to. Only the way it is
 * reached changes: its own base URL, or a WebRTC tunnel addressed by the
 * access code its `llama-server --connect` prints.
 */

/** How a provider is reached. */
export enum BackendKind {
	/** The llama-server serving this UI; it has no base URL of its own. */
	LOCAL = 'local',
	/** A remote llama.cpp server, reached through a WebRTC tunnel. */
	REMOTE = 'remote',
	/** A llama.cpp server answering on its own base URL. */
	URL = 'url'
}

/** Tunnel state of a remote provider. */
export enum TunnelStatus {
	/** Data channel open and authenticated. */
	CONNECTED = 'connected',
	/** Handshake in progress; requests for the provider are held back. */
	CONNECTING = 'connecting',
	/** Handshake failed or the channel dropped; requests are refused. */
	ERROR = 'error',
	/** No tunnel for this provider, none attempted. */
	IDLE = 'idle'
}
