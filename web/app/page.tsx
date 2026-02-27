'use client'

import { useEffect, useState, useMemo, useRef } from 'react'

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface KnowledgeItem {
  id: string
  category: string
  title: string
  content: string
  tags: string[]
}

interface KnowledgeBase {
  updated_at: string
  total: number
  items: KnowledgeItem[]
}

// ──────────────────────────────────────────────────────────────────────
// Category config
// ──────────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { emoji: string; pill: string; header: string }> = {
  'Pediatricians & Specialists': {
    emoji: '🩺',
    pill: 'bg-pink-100 text-pink-800 border-pink-200',
    header: 'from-pink-50 to-white border-pink-100',
  },
  'OB/GYNs': {
    emoji: '🤰',
    pill: 'bg-purple-100 text-purple-800 border-purple-200',
    header: 'from-purple-50 to-white border-purple-100',
  },
  'Baby Classes & Activities': {
    emoji: '🎶',
    pill: 'bg-green-100 text-green-800 border-green-200',
    header: 'from-green-50 to-white border-green-100',
  },
  'Fitness & Wellness': {
    emoji: '💪',
    pill: 'bg-orange-100 text-orange-800 border-orange-200',
    header: 'from-orange-50 to-white border-orange-100',
  },
  'Stroller-Friendly Dining': {
    emoji: '🍽️',
    pill: 'bg-sky-100 text-sky-800 border-sky-200',
    header: 'from-sky-50 to-white border-sky-100',
  },
  'Childcare & Nannies': {
    emoji: '🏠',
    pill: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    header: 'from-yellow-50 to-white border-yellow-100',
  },
  'Baby Products & Gear': {
    emoji: '🛍️',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    header: 'from-indigo-50 to-white border-indigo-100',
  },
  'Home Services': {
    emoji: '🧹',
    pill: 'bg-teal-100 text-teal-800 border-teal-200',
    header: 'from-teal-50 to-white border-teal-100',
  },
  'Beauty & Personal Care': {
    emoji: '✨',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
    header: 'from-rose-50 to-white border-rose-100',
  },
  'UWS Local Tips': {
    emoji: '📍',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    header: 'from-amber-50 to-white border-amber-100',
  },
  'Parenting Tips': {
    emoji: '💡',
    pill: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    header: 'from-cyan-50 to-white border-cyan-100',
  },
}

const DEFAULT_CONFIG = {
  emoji: '📌',
  pill: 'bg-gray-100 text-gray-700 border-gray-200',
  header: 'from-gray-50 to-white border-gray-100',
}

function getCfg(category: string) {
  return CATEGORY_CONFIG[category] ?? DEFAULT_CONFIG
}

// ──────────────────────────────────────────────────────────────────────
// Card component
// ──────────────────────────────────────────────────────────────────────
function KnowledgeCard({
  item,
  onTagClick,
}: {
  item: KnowledgeItem
  onTagClick: (tag: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getCfg(item.category)
  const isLong = item.content.length > 160

  return (
    <div className="kb-card bg-white rounded-2xl shadow-sm border border-[#EAE5DD] overflow-hidden">
      {/* Category header strip */}
      <div className={`px-4 pt-3 pb-2 bg-gradient-to-b ${cfg.header} border-b`}>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.pill}`}
        >
          {cfg.emoji} {item.category}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-[#1A1A1A] text-sm leading-snug mb-2">{item.title}</h3>
        <p
          className={`text-gray-600 text-xs leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}
        >
          {item.content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#E07A5F] text-xs mt-1 font-medium hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="px-2 py-0.5 bg-[#F8F5F0] text-gray-500 text-xs rounded-full
                           hover:bg-[#E07A5F] hover:text-white transition-colors duration-150"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [data, setData] = useState<KnowledgeBase | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/knowledge.json')
      .then((r) => r.json())
      .then((d: KnowledgeBase) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.items.map((i) => i.category))].sort()
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.toLowerCase().trim()
    return data.items.filter((item) => {
      const matchesCat = activeCategory === 'All' || item.category === activeCategory
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [data, search, activeCategory])

  const countFor = (cat: string) =>
    data?.items.filter((i) => i.category === cat).length ?? 0

  const handleTagClick = (tag: string) => {
    setSearch(tag)
    setActiveCategory('All')
    searchRef.current?.focus()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">☕</div>
          <p className="text-gray-400 text-sm">Loading knowledge base...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0]">
      {/* ── Sticky header ── */}
      <header className="bg-white border-b border-[#EAE5DD] sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">☕</span>
              <div>
                <h1 className="text-lg font-bold text-[#1A1A1A] leading-none">
                  UWS Mamas Knowledge Base
                </h1>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Community wisdom · {data?.total ?? 0} tips
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              🔍
            </span>
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors, restaurants, activities, formula..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DDD8D0] bg-[#F8F5F0]
                         text-sm focus:outline-none focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent
                         placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Category filter strip ── */}
        <div className="border-t border-[#EAE5DD] bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-2 py-2.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory('All')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                  activeCategory === 'All'
                    ? 'bg-[#E07A5F] text-white border-[#E07A5F]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#E07A5F] hover:text-[#E07A5F]'
                }`}
              >
                All ({data?.items.length ?? 0})
              </button>

              {categories.map((cat) => {
                const cfg = getCfg(cat)
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat === activeCategory ? 'All' : cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#E07A5F] text-white border-[#E07A5F]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#E07A5F] hover:text-[#E07A5F]'
                    }`}
                  >
                    {cfg.emoji} {cat} ({countFor(cat)})
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🤷‍♀️</p>
            <p className="text-base font-medium text-gray-500">No results for &ldquo;{search}&rdquo;</p>
            <p className="text-sm mt-1">Try a different search term or browse by category</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('All') }}
              className="mt-4 px-5 py-2 bg-[#E07A5F] text-white text-sm rounded-full hover:bg-[#d06a4f] transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {search && (
              <p className="text-xs text-gray-400 mb-4">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
                {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <KnowledgeCard key={item.id} item={item} onTagClick={handleTagClick} />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-300 mt-10">
          {filtered.length} of {data?.items.length} items · Last updated {data?.updated_at}
        </p>
      </div>
    </main>
  )
}
