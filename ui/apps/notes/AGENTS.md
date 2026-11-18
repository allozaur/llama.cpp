# Instructions for ui/apps/notes

These add to the repository's [AGENTS.md](../../../AGENTS.md) for work in `ui/apps/notes`: **Llama Notes**, a notes app whose text a model on llama-server continues. See [README.md](README.md) for its structure and commands.

- **Design:** Notes follows Llama Chat's [DESIGN.md](../chat/DESIGN.md). Tokens, fonts and base components come from Llama UI (`@ggml-org/llama-ui/ui/<name>`, in `ui/lib/ui`); Notes keeps no copy of them.
- **Conventions:** the same as `ui/apps/chat`: imports name the `.ts` file, `#lib/...` aliases, links and `goto` targets through `resolve()` from `$app/paths`.
- **Shared with Llama Chat:** only through `ui/lib/ui`. Do not import from `ui/apps/chat`. `scripts/llama-ui.js` and `scripts/vite-plugin-llama-ui.ts` are copies of Chat's; keep them the same.
- **A file named `server.*` is server-only to SvelteKit** and cannot be imported in the app: name llama-server modules `llama-server.*`.
