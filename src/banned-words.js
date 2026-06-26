import pool from './db.js'

let cache = { words: [], ts: 0 }
const CACHE_TTL = 30000

export async function getBannedWords() {
  if (Date.now() - cache.ts < CACHE_TTL) return cache.words
  try {
    const [[row]] = await pool.query('SELECT banned_words FROM content_config WHERE id = 1')
    if (!row?.banned_words) { cache = { words: [], ts: Date.now() }; return [] }
    const words = typeof row.banned_words === 'string' ? JSON.parse(row.banned_words) : row.banned_words
    cache = { words: Array.isArray(words) ? words : [], ts: Date.now() }
    return cache.words
  } catch {
    return []
  }
}

export function containsBannedWord(text, bannedWords) {
  if (!bannedWords?.length) return false
  const lower = text.toLowerCase()
  return bannedWords.some(w => w && lower.includes(w.toLowerCase()))
}
