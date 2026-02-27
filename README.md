# UWS Mamas Knowledge Base ☕

A searchable knowledge base built from 4 WhatsApp community groups (~19,000 messages) serving Upper West Side parents in NYC.

**Live demo:** https://mamas-kb-psf8.vercel.app/

---

## What it does

NYC parent WhatsApp groups are goldmines of hyper-local knowledge: pediatrician recs, baby swim classes, stroller-friendly restaurants, formula tips. But the information is buried in thousands of messages and impossible to search.

This project extracts that knowledge into a clean, searchable website anyone in the community can use.

**Features:**
- Full-text search across 218 knowledge items
- Filter by 19 categories (pediatricians, OBGYNs, dentists, doulas, sleep consultants, pelvic floor PTs, classes, dining, and more)
- Clickable tags that trigger related searches
- Fully anonymous: no sender names, only the information itself
- Mobile responsive

---

## Privacy by design

No personal data ever leaves the source. The pipeline strips all sender names and metadata before extraction. What gets published is purely the knowledge shared: doctor names, business names, tips. No member identities, no message timestamps, no media.

This matters. I work at [Cape](https://www.cape.com), a private and secure cellular network, where privacy is not a feature but a foundation. That same principle shaped how this project handles community data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Data pipeline | Python 3, Anthropic Claude API (Haiku) |
| Hosting | Vercel (free tier) |
| Data format | Static JSON served from `/public` |

---

## How it works

```
WhatsApp exports (.txt)
        ↓
  scripts/parse_chats.py
  · Parses WhatsApp message format
  · Filters noise (logistics, reactions, system messages)
  · Strips all sender names and metadata
  · Batches messages → Claude API for semantic extraction
  · Deduplicates across groups
        ↓
  web/public/knowledge.json
  (218 items, 19 categories)
        ↓
  Next.js static site
  · Client-side search + filter
  · Deployed to Vercel
```

---

## Project structure

```
mamas-kb/
├── scripts/
│   ├── parse_chats.py      # WhatsApp → JSON pipeline
│   └── requirements.txt
└── web/                    # Next.js app
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx         # Search UI + knowledge cards
    │   └── globals.css
    └── public/
        └── knowledge.json  # 218 extracted knowledge items
```

---

## Running locally

```bash
# Web app
cd web
npm install
npm run dev
# → http://localhost:3000

# Re-parse chats (to update knowledge.json)
pip install anthropic
export ANTHROPIC_API_KEY=your_key
cd scripts
python parse_chats.py chat1.txt chat2.txt chat3.txt chat4.txt
```

---

## Deploy

Connected to Vercel via GitHub. Auto-deploys on every push to `main`.
