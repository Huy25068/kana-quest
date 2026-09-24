/** Các cách gõ romaji thay thế được chấp nhận (Hepburn ↔ Kunrei / kiểu IME). */
const ALIASES: Record<string, string[]> = {
  shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'], wo: ['o'], n: ['nn'],
  sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'],
  ja: ['zya', 'jya'], ju: ['zyu', 'jyu'], jo: ['zyo', 'jyo'],
}

export function acceptedRomaji(romaji: string): string[] {
  return [romaji, ...(ALIASES[romaji] ?? [])]
}

export function matchesRomaji(input: string, romaji: string) {
  const v = input.trim().toLowerCase()
  return acceptedRomaji(romaji).includes(v)
}
