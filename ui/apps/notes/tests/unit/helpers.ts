/** A streamed response whose body arrives in the given pieces. */
export function streamResponse(pieces: string[], init: ResponseInit = { status: 200 }): Response {
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const piece of pieces) controller.enqueue(encoder.encode(piece));

			controller.close();
		}
	});

	return new Response(body, init);
}

/** One server-sent event of a `/completion` stream. */
export function sse(chunk: object): string {
	return `data: ${JSON.stringify(chunk)}\n\n`;
}
