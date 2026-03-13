# ClipMeta

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**ClipMeta** is a stock-footage-first metadata workflow platform.

Upload video clips, generate AI-powered stock-ready metadata, review and edit results, and export CSV files for stock submission — all in one place.

## Features

- **Upload Video Clips** — Direct-to-storage uploads with real progress tracking. Handles large files.
- **AI Metadata Generation** — Extracts frames from your clip, sends them to OpenAI, and generates: title, description, keywords, category, location, and confidence score.
- **Review & Edit Inline** — Inspect generated metadata, edit any field, fix keywords — all before export.
- **Export CSV** — One-click download of stock-ready metadata in CSV format.
- **Batch Workflow** — Organize clips into projects. Upload in batches. Review in batches. Export in batches.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend / DB / Auth / Storage | Supabase |
| AI | OpenAI (GPT-4o-mini vision) |
| Billing | Stripe (planned) |
| Hosting | Vercel |

## Quick Start

```bash
git clone <repo-url>
cd clipmeta
npm install
cp .env.local.example .env.local  # add your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## License

MIT
