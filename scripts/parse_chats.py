#!/usr/bin/env python3
"""
parse_chats.py — WhatsApp Chat → Knowledge Base

Usage:
  python parse_chats.py file1.txt file2.txt file3.txt --output ../web/public/knowledge.json

Requires:
  pip install anthropic
  export ANTHROPIC_API_KEY=your_key_here
"""

import re
import json
import sys
import os
import argparse
from pathlib import Path
from datetime import date

import anthropic

# ──────────────────────────────────────────────────────────────────────
# PARSING
# ──────────────────────────────────────────────────────────────────────

MSG_RE = re.compile(
    r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s*[APap][Mm]\]\s+[~\s]*([^:]+):\s*(.+)',
    re.MULTILINE
)

# System / noise messages to skip entirely
SKIP_IF_CONTAINS = [
    'joined from the community',
    'joined using a group link',
    'joined using this group',
    'was added',
    'changed the group name',
    'changed the group description',
    'changed the group icon',
    'changed the subject',
    'image omitted',
    'video omitted',
    'document omitted',
    'Contact card omitted',
    'GIF omitted',
    'Sticker omitted',
    'audio omitted',
    'This message was deleted',
    'Messages and calls are end-to-end encrypted',
    '‎POLL:',
    '‎OPTION:',
    'This message was edited',
    'created this group',
    'left',
]

# Short social acknowledgments with no useful content
SKIP_EXACT = {
    'yes', 'no', 'ok', 'okay', 'sure', 'great', 'perfect', 'thanks',
    'thank you', 'thank you!', 'thanks!', 'amazing', 'awesome', 'love this',
    'love it', 'same', 'same here', 'me too', 'agreed', 'absolutely',
    'definitely', 'sounds good', 'got it', 'noted', 'of course', 'exactly',
    'nice', 'cute', 'cool', 'wow', 'oh wow', 'sweet', 'wonderful', 'lovely',
    '❤️', '🙏', '👍', '😍', '🥰', '💕', '♥️', '❤', '🤍', '💛',
    'welcome!', 'welcome', 'hi!', 'hi', 'hello', 'haha', 'lol',
    'yay!', 'yay', 'so cute!', 'so cute', 'congrats!', 'congrats',
}

# Pure logistics / coordination phrases (walk meetup chatter)
COORDINATION_PHRASES = [
    "i'm on my way", "on my way", "i'm here", "we're here", "almost there",
    "running late", "running 5", "running ten", "be there in",
    "heading over now", "heading over", "heading out now", "heading out",
    "see you soon", "see you there", "we'll be there",
    "just arrived", "just got here", "just got to",
    "we are at", "we're at", "i'm at", "i am at",
    "walking over", "walking up", "walking down",
]


def is_coordination(text: str) -> bool:
    tl = text.lower()
    if len(text) < 80:  # short messages are more likely to be coordination
        for phrase in COORDINATION_PHRASES:
            if phrase in tl:
                return True
    return False


def parse_file(path: str, source_name: str) -> list[dict]:
    """Parse a WhatsApp export .txt file into clean message dicts."""
    content = Path(path).read_text(encoding='utf-8', errors='replace')

    messages = []
    for m in MSG_RE.finditer(content):
        date_str, sender, text = m.groups()
        text = text.strip()

        # Remove @mentions like @⁨~Name⁩
        text = re.sub(r'@⁨[^⁩]+⁩', '', text).strip()
        # Remove URLs (keep them if they're the only content? No, skip URL-only messages)
        text_no_url = re.sub(r'https?://\S+', '', text).strip()

        if not text_no_url:
            continue

        # Skip system/noise messages
        if any(skip in text for skip in SKIP_IF_CONTAINS):
            continue

        # Skip very short acknowledgments
        clean = text.lower().strip('!.,? 🎉🎊😊😀')
        if clean in SKIP_EXACT:
            continue

        # Skip very short messages (< 20 chars)
        if len(text) < 20:
            continue

        # Skip pure coordination
        if is_coordination(text):
            continue

        messages.append({
            'text': text,
            'source': source_name,
        })

    return messages


# ──────────────────────────────────────────────────────────────────────
# AI EXTRACTION
# ──────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert at extracting useful, searchable knowledge from community chat conversations.

You will receive messages from a NYC Upper West Side moms WhatsApp group. Your job is to:
1. Identify messages containing genuinely useful, searchable knowledge (recommendations, tips, resources, advice)
2. Extract each piece of knowledge as a structured item
3. IGNORE: social coordination (walk timing, "I'm on my way"), vague small talk, pure emotional responses

Use these categories (use the EXACT name):
- "Pediatricians & Specialists" — doctor/specialist recommendations (name, practice, location, specific notes)
- "OB/GYNs" — obstetrician recommendations
- "Baby Classes & Activities" — swimming, music, gymnastics, story time (include age range, location, cost if mentioned)
- "Fitness & Wellness" — postnatal yoga, personal trainers, massage, gyms
- "Stroller-Friendly Dining" — restaurants with stroller access, changing tables, notes
- "Childcare & Nannies" — daycares, nanny agencies, babysitters, night nurses
- "Baby Products & Gear" — formula, strollers, cribs, gear, nursery items
- "Home Services" — cleaners, handymen, local services
- "Beauty & Personal Care" — hair, massage, self-care for moms
- "UWS Local Tips" — parks, playgrounds, bike spots, local resources, events
- "Parenting Tips" — feeding advice, sleep tips, health, development

Output a JSON array. Each item:
{
  "category": "exact category name",
  "title": "concise title under 60 chars",
  "content": "useful description with key details (names, addresses, prices, age ranges, specific notes)",
  "tags": ["tag1", "tag2", "tag3"]  // 2-4 lowercase tags
}

Rules:
- Never include the names of the people who posted — only the information they shared
- DO include names of doctors, businesses, products — these are the useful facts
- If multiple messages discuss the same thing, combine into one item
- Return [] if no useful knowledge found in this batch
- Return ONLY a JSON array, no other text"""


def extract_knowledge(client: anthropic.Anthropic, messages: list[dict]) -> list[dict]:
    """Use Claude Haiku to extract knowledge items from a batch of messages."""
    text = "\n".join(f"• {m['text']}" for m in messages)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Extract knowledge from these chat messages:\n\n{text}"
            }]
        )

        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        items = json.loads(raw)
        return items if isinstance(items, list) else []

    except Exception as e:
        print(f"  Warning: batch failed ({e})", file=sys.stderr)
        return []


# ──────────────────────────────────────────────────────────────────────
# DEDUPLICATION
# ──────────────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', s.lower())


def deduplicate(items: list[dict]) -> list[dict]:
    """Remove near-duplicate items by normalized title."""
    seen = set()
    unique = []
    for item in items:
        key = normalize(item.get('title', ''))
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Parse WhatsApp group chats into a searchable knowledge base'
    )
    parser.add_argument('files', nargs='+', help='WhatsApp .txt export files')
    parser.add_argument(
        '--output', default='../web/public/knowledge.json',
        help='Output JSON path (default: ../web/public/knowledge.json)'
    )
    parser.add_argument('--batch-size', type=int, default=50, help='Messages per API batch')
    args = parser.parse_args()

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("Error: Set the ANTHROPIC_API_KEY environment variable", file=sys.stderr)
        print("  export ANTHROPIC_API_KEY=sk-ant-...", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # ── Parse all files ──
    all_messages = []
    for f in args.files:
        name = Path(f).stem.replace('_', ' ').title()
        print(f"Parsing {f} ({name})...")
        msgs = parse_file(f, name)
        print(f"  {len(msgs)} useful messages extracted")
        all_messages.extend(msgs)

    print(f"\nTotal messages to process: {len(all_messages)}")

    # ── Process in batches ──
    batches = [all_messages[i:i+args.batch_size] for i in range(0, len(all_messages), args.batch_size)]
    all_items = []

    for i, batch in enumerate(batches):
        print(f"Batch {i+1}/{len(batches)} ({len(batch)} msgs)...", end=' ', flush=True)
        items = extract_knowledge(client, batch)
        print(f"→ {len(items)} items")
        all_items.extend(items)

    # ── Deduplicate ──
    unique_items = deduplicate(all_items)
    print(f"\nTotal: {len(all_items)} raw → {len(unique_items)} after deduplication")

    # ── Add IDs ──
    for i, item in enumerate(unique_items):
        item['id'] = str(i + 1)

    # ── Sort by category ──
    unique_items.sort(key=lambda x: x.get('category', ''))

    # ── Build output ──
    categories = sorted(set(item.get('category', 'Other') for item in unique_items))
    output = {
        'updated_at': str(date.today()),
        'total': len(unique_items),
        'categories': categories,
        'items': unique_items,
    }

    # ── Save ──
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"\n✓ Saved to {out_path}")
    print(f"  {len(unique_items)} items across {len(categories)} categories:")
    for cat in categories:
        count = sum(1 for i in unique_items if i.get('category') == cat)
        print(f"  · {cat}: {count}")


if __name__ == '__main__':
    main()
