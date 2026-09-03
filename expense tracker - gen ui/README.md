# Nexus Expense AI

Nexus Expense AI is a conversational expense tracker powered by a LangGraph agent and Groq models. Users can add and review expenses with natural language, generate spending charts, and scan receipts for automatically extracted details.

## Features

- Add expenses through natural language
- Query expenses by date range
- Generate daily, weekly, or monthly spending charts
- Scan receipts with Tesseract.js OCR and Groq extraction
- Review and edit receipt data before saving
- Stream AI responses and tool activity using SSE
- Store expense data locally in SQLite

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript
- **AI:** LangChain, LangGraph, Groq
- **Data:** SQLite
- **OCR:** Tesseract.js

## Project Structure

```text
client/     React frontend
server/     Express API, AI agent, tools, OCR, and SQLite database
project.md  Detailed architecture and backend documentation
```

## Getting Started

### Prerequisites

- Node.js 22.5 or newer
- npm
- A Groq API key

### Start the backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
GROQ_API_KEY=your_groq_api_key
```

Run the API:

```bash
npm run dev
```

The backend runs at `http://localhost:3000`.

### Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Example Prompts

```text
Add 500 Rs for coffee today
Show my expenses from 2026-09-01 to 2026-09-30
How much did I spend this month?
Show a monthly chart of my spending for the last three months
```

## API

- `POST /chat`: Processes a natural-language expense request and returns an SSE stream with AI responses and tool events.
- `POST /scan-receipt`: Accepts a Base64 receipt image and returns OCR text plus structured receipt data.

## Current Limitations

- Expenses are stored in the local `server/expenses.db` SQLite file.
- Category and receipt date are extracted but are not currently persisted by the insert tool.
- The chat thread ID is hard-coded, so multi-user session isolation is not implemented.
- Receipt OCR currently supports English (`eng`).
- Production deployment should add authentication, restricted CORS, validation, and rate limiting.

See [project.md](project.md) for the complete architecture, request flows, database schema, agent behavior, and improvement roadmap.

## License

No license has been specified for this project yet.
