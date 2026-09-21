# PaperLens

PaperLens is a high-fidelity React implementation of the CS3249 Figma prototype. It keeps the course starter's Vite + TypeScript structure while replacing the sample interface with the complete paper-reading workspace.

## Run locally

```bash
npm ci
npm start
```

Open the local URL printed by the start script.

## Included interactions

- Load a paper by clicking, dropping a file, or opening a paper URL.
- Choose a reading goal and a suggested opening question.
- Continue with multiple follow-up messages and jump between questions using the right-side navigator.
- Open history on both the landing and reading states.
- Resize the paper and conversation panes by dragging the centre handle.
- Cycle the paper zoom through 80%, 100%, and 125%.
- Change response language; every language row has a hover state.
- Use the three header actions for a new conversation, language settings, and notes.
- Review a live session-notes view.

The assistant replies are deterministic prototype data; connect `addExchange` in `src/components/PaperLensWorkspace.tsx` to a backend when an API is available.

## Project map

- `src/components/PaperLensWorkspace.tsx` — application state and interactions
- `src/styles/theme.css` — PaperLens design tokens
- `src/styles/app.css` — responsive high-fidelity styling
- `src/assets/` — paper preview imagery from the prototype

## Checks

```bash
npm test
npm run build
```
