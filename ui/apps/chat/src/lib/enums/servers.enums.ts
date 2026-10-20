/**
 * Server transport enums.
 *
 * Every entry is a llama.cpp server the UI can talk to; only the way it is
 * reached changes: its own base URL, or a WebRTC tunnel addressed by the access
 * code its `llama-server --connect` prints.
 */

/** How a server is reached. */
export enum ServerKind {
	/** The llama-server serving this UI; it has no base URL of its own. */
	LOCAL = 'local',
	/** A remote llama.cpp server, reached through a WebRTC tunnel. */
	REMOTE = 'remote',
	/** A llama.cpp server answering on its own base URL. */
	URL = 'url'
}

/** Tunnel state of a remote server. */
export enum TunnelStatus {
	/** Data channel open and authenticated. */
	CONNECTED = 'connected',
	/** Handshake in progress; requests for the server are held back. */
	CONNECTING = 'connecting',
	/** Handshake failed or the channel dropped; requests are refused. */
	ERROR = 'error',
	/** No tunnel for this server, none attempted. */
	IDLE = 'idle'
}
