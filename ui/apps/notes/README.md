# Llama Notes

A notes app for llama.cpp: write text and let a model on llama-server continue it. Where Llama Chat
talks to a model through chat messages, Notes sends the text of a note as it is, through
llama-server's raw `/completion` endpoint, and appends what comes back.

- Notes are kept in this browser (IndexedDB). There is no sync and no export yet.
- **Generate** (Shift+Enter) continues the note from its end; **Stop** (Shift+Enter again) ends it.
- **Undo** and **Redo** (Cmd/Ctrl+Z, Cmd/Ctrl+Y) take the last generation away and bring it back,
  until the note is edited.
- The gauge shows the note's tokens against the model's context size, counted through `/tokenize`.
- With a llama-server that routes between several models, the toolbar has a model picker.

## Structure

```text
src/
├── routes/                  / (the notes) and /note/[id] (one note)
└── lib/
    ├── components/          the note screen, its editor and toolbar, the notes list
    ├── services/            llama-server calls (completion, tokenize, props, models) and IndexedDB
    ├── stores/              the notes, the server's state, one open note's generation
    ├── types/, constants/, utils/
```

The app owns its logic and takes everything visual from `@ggml-org/llama-ui` (`ui/lib/ui`): tokens,
fonts, theme and base components. As in Llama Chat, the library is compiled from its sources as part
of this app's build (`scripts/llama-ui.js`, `scripts/vite-plugin-llama-ui.ts`), with no install or
build in `ui/lib/ui`.

The editor is CodeMirror with Markdown highlighting. It shows the source: the live-preview Markdown
editor of Llama Chat lives in that app and is not shared yet.

## Development

```sh
npm ci
npm run dev
```

The dev server proxies `/completion`, `/tokenize`, `/props` and `/v1` to llama-server, at
`http://localhost:9931` unless `VITE_PUBLIC_SERVER_ORIGIN` names another (see `.env.example`).

```sh
npm run check        # types
npm run lint         # prettier and eslint
npm run test         # unit tests, and client tests in a browser
npm run build        # static files in dist/
```

## Serving

`npm run build` writes static files to `dist/`. The app calls llama-server on relative URLs, so it
must be served from the same origin as llama-server, or behind a proxy that forwards the four paths
above. llama-server does not embed Notes, and there is no `npx` command for it yet.
