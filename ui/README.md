# ui

The UI of llama.cpp: the packages in `lib` and the apps built on them.

```text
ui/
├── lib/
│   ├── ui/         @ggml/llama-ui: design tokens, fonts, surfaces and components
│   └── harness/    @ggml/llama-harness: the agentic loop, headless
└── apps/
    └── chat/       Llama Chat, the chat app that llama-server serves
```

- [`lib/ui`](lib/ui/README.md) draws the parts and handles interaction, with no business logic. It is built with
  `@sveltejs/package` and published to npm as `@ggml/llama-ui`.
- [`lib/harness`](lib/harness/README.md) is the agentic loop: plain TypeScript with no UI and no dependencies. An app
  gives it an inference client and tools, and reads its events.
- [`apps/chat`](apps/chat/README.md) talks to llama-server, stores conversations and runs the agentic loop through the
  harness. CMake builds it into llama-server (see `scripts/ui-assets.cmake`).

Each folder is its own npm package with its own `package-lock.json`: run `npm ci` in the one you work on.

The split between library and app is not finished. Llama Chat does not import `@ggml/llama-ui` yet: it still carries
its own copy of the tokens and base components (`apps/chat/src/lib/components/ui`), with `DESIGN.md`, `BRAND.md` and
the full Storybook beside it. `lib/ui` holds what llama.app uses today; Chat moves onto it next.
