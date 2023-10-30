import claude from './claude.json'
import { Tiktoken, TiktokenBPE } from 'js-tiktoken'

// Modified from: https://github.com/anthropics/anthropic-tokenizer-typescript
// (they use an old version of Tiktoken that isn't edge compatible)

export function countTokens(text: string): number {
  const tokenizer = getTokenizer()
  const encoded = tokenizer.encode(text.normalize('NFKC'), 'all')
  return encoded.length
}

// ----------------------
// Private APIs
// ----------------------

const getTokenizer = (): Tiktoken => {
  const ranks: TiktokenBPE = {
    bpe_ranks: claude.bpe_ranks,
    special_tokens: claude.special_tokens,
    pat_str: claude.pat_str,
  }
  return new Tiktoken(ranks)
}