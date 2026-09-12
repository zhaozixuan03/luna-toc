# LunaTOC

A lightweight Chrome extension that adds a Table of Contents (TOC) sidebar to ChatGPT conversations.

LunaTOC helps you navigate long conversations by automatically turning your prompts into a searchable, clickable outline.

👉 [Install from Chrome Web Store](https://chromewebstore.google.com/detail/chattoc/ibfdglfgljonajofiiaonlimoiolkcpa)

[![Release](https://img.shields.io/badge/release-latest-blue)](https://github.com/Leo7805/chat-toc/releases/latest)

![Demo](assets/demo-v1.5.gif)

---

## Features

- Automatically generates a TOC from user prompts
- Expand prompts to navigate answer headings
- Click any prompt to instantly jump to its location
- Mark important prompts for quick visual reference
- Search and filter prompts
- Switch between Raw prompt text and locally generated Smart Labels for context-dependent prompts; Smart binds reply intent to specific nearby answer evidence
- Choose Luna Blue, ChatGPT Warm, Sage, Violet, or a custom color palette
- Save and reuse custom prompt templates
- Import and export saved prompts as editable Markdown files
- Autocomplete saved prompts inside ChatGPT's input box
- Highlights the prompt currently visible in the conversation
- Preview full prompt content on hover
- View the full conversation title from the sidebar title tooltip
- Automatically updates when new prompts are sent
- Resizable sidebar
- Pinnable sidebar with optional hover-based auto-hide
- Draggable floating toggle button with per-tab position memory
- SVG refresh button to rebuild the TOC
- Detects text, image, and file prompts
- Works entirely in the browser

---

## Installation

### Option 1: Load Unpacked (Developer Mode)

1. Download or clone this repository.
2. Install dependencies and build the extension:

   ```bash
   npm install
   npm run build
   ```

3. Open Chrome and navigate to:

   ```text
   chrome://extensions
   ```

4. Enable **Developer Mode**.
5. Click **Load unpacked**.
6. Select the generated `luna-toc/dist` directory.

---

## Usage

1. Open any ChatGPT conversation.
2. The LunaTOC sidebar will appear on the right side.
3. Click a TOC item to jump to that prompt.
4. Use the search box to filter prompts.
5. Choose Raw or Smart above the TOC. Smart can use a specific answer heading or explicitly introduced topic, and can resolve a choice or uncertainty from one unambiguous preceding question group. Without reliable local evidence it keeps the raw prompt. Prompt content and navigation IDs remain untouched.
6. Click the sidebar gear or open the extension popup to choose a preset palette, edit Custom colors, or clear the local Smart Label cache.
7. Switch to My Prompts to manage saved prompt templates.
8. Right-click a prompt item to add it to My Prompts.
9. Use the My Prompts import and export buttons to transfer saved prompts as Markdown.
10. Type `#` or `//` in the ChatGPT input box to autocomplete a saved prompt.
11. Hover over a truncated prompt to preview the full original content.
12. Drag the left edge of the sidebar to resize it.
13. Use the sidebar pin button to keep the sidebar open or enable auto-hide.
14. Hover the floating button to reveal an auto-hidden sidebar, or drag it to reposition it for the current tab.

---

## Why LunaTOC?

ChatGPT conversations can become very long, making it difficult to find previous prompts.

LunaTOC provides a lightweight navigation layer that lets you:

- Quickly revisit earlier questions
- Navigate long technical discussions
- Review project planning conversations
- Jump between different topics without endless scrolling

---

## Tech Stack

- TypeScript
- ES Modules
- Vite and CRXJS
- Chrome Extension (Manifest V3)
- DOM Manipulation
- MutationObserver
- Fetch Hooking
- Server-Sent Events (SSE)

---

## Development

Start the Vite development process:

```bash
npm run dev
```

Create a production extension in `dist/`:

```bash
npm run typecheck
npm run build
```

The root `manifest.json` is the source Manifest. Chrome loads the generated
`dist/` directory. Browser source, Vite configuration, and release tooling are
all written in TypeScript and checked by `npm run typecheck`.

---

## Versioning

The native npm version commands require a clean Git working tree, synchronize
`package.json` and `manifest.json`, create a version commit, and tag that commit.
The lifecycle runs `scripts/version.ts` through `tsx`. It does not push the
commit or tag.

```bash
npm version patch
npm version minor
npm version major
```

---

## Privacy

LunaTOC runs entirely in your browser and does not send conversation data to
an external service. Smart Labels use conservative deterministic rules and
never call an LLM or network API. They keep prompts with a concrete topic,
question, attachment, code, or action unchanged, and do not guess when nearby
answer evidence is missing, incomplete, or ambiguous.

To keep labels consistent across visits, the extension stores only generated
Smart Labels, source revision signatures, decision types, and their conversation/message identifiers in
`chrome.storage.local`. It does not add source prompts or assistant responses to
that cache. The popup provides a clear-cache action. The initial cache bounds
are 50 conversations, 500 labels per conversation, and 180 days since last
access; these provisional limits will be reassessed after usage evidence is
available.

Smart Labels can display on two lines. Hovering one shows both its complete
label and the original Prompt. When an answer heading is promoted to the parent
label, the duplicate first outline row is hidden while other answer headings
remain available.

---

## License

MIT License
