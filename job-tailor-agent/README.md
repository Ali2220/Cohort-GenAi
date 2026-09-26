# Job Tailor Agent

A TypeScript-based MCP (Model Context Protocol) application that helps tailor a resume and write a cover letter based on a job posting and the user's master resume data.

It loads a user's resume and contact information as context, scrapes a job posting URL, and then uses an LLM to generate targeted application documents.

## Overview

This project combines:

- An MCP server that exposes tools, resources, and prompts
- A client that connects to the server and interacts with the model
- Groq-powered prompting for resume adaptation and job-specific writing
- Utility tools to save generated documents and export them to PDF

The workflow is designed for job applications where a user wants to:

- scrape a job posting from a URL
- compare it against their master resume
- generate a tailored resume summary and bullets
- create a cover letter for the same role
- save or export the final document

## Features

### MCP Tools

- `scrape_job_url`: Fetches and extracts the main content from a job posting URL
- `save_document`: Saves a generated document as a Markdown file
- `export_to_pdf`: Converts document text into a basic PDF in the output folder

### MCP Resources

- `resume://master`: Loads the master resume from the local data folder
- `profile://contact`: Loads the user's contact data from a JSON file

### MCP Prompts

- `tailor_resume`: Rewrites the resume to fit a specific job description
- `write_cover_letter`: Generates a job-specific cover letter in a defined tone

## Project Structure

```text
job-tailor-agent/
├── data/
│   ├── contact.json
│   └── master-resume.md
├── src/
│   ├── client/
│   │   ├── agent.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   └── mcp.ts
│   └── server/
│       ├── index.ts
│       ├── server.ts
│       ├── prompts/
│       │   ├── tailorResume.ts
│       │   └── writeCoverLetter.ts
│       ├── resources/
│       │   ├── contactInfo.ts
│       │   └── masterResume.ts
│       ├── tools/
│       │   ├── exportToPdf.ts
│       │   ├── saveDocument.ts
│       │   └── scrapeJobUrl.ts
│       └── utils/
│           ├── paths.ts
│           └── wrapText.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Tech Stack

- TypeScript
- Node.js
- Model Context Protocol SDK
- Groq SDK
- Cheerio for scraping HTML content
- PDF-Lib for PDF export
- Zod for schema validation

## Prerequisites

Before running the project, make sure you have:

- Node.js installed
- npm installed
- A Groq API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with your Groq key:

```env
GROQ_API_KEY=your_api_key_here
```

## Running the Project

### Build the server

```bash
npm run build
```

### Start the MCP server

```bash
npm run server
```

### Start the client

From the project root, run the client directly:

```bash
npx tsx src/client/index.ts
```

The client will connect to the compiled server and allow interactive commands such as:

```text
/prompts
/use tailor_resume jobTitle="Senior Backend Engineer" company="Acme"
exit
```

## How It Works

1. The server registers a set of resources, tools, and prompts.
2. The client loads the resume and contact info as system context.
3. The user can fetch a job posting using `scrape_job_url`.
4. The model receives the job details and the resume context.
5. A tailored resume or cover letter is generated and can be saved or exported.

## Data Files

The app reads from the `data` folder:

- `data/master-resume.md`: candidate's base resume
- `data/contact.json`: contact details used in cover letters and output documents

## Output Files

Generated documents are saved under the `output` directory.

This includes:

- Markdown resume drafts
- Markdown cover letters
- PDF exports when requested

## Example Workflow

```text
1. Start the server
2. Start the client
3. Use /prompts to see available prompt templates
4. Use /use tailor_resume ... to tailor the resume
5. Use /use write_cover_letter ... to generate a cover letter
6. Save or export the final document
```

## Notes

- This project is built as a local MCP agent workflow for job application assistance.
- The app relies on the structured data in the `data` folder to personalize output.
- The server is the main integration point for tools and prompts; the client handles the user-facing chat loop.

## License

This project is currently unlicensed unless a license file is added later.
