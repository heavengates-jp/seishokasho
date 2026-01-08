export const decodeEntities = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, num) =>
      String.fromCharCode(parseInt(num, 10)),
    )

export const parseBdscPreview = (raw: string) => {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(raw, 'application/xml')
  if (xmlDoc.querySelector('parsererror')) return ''
  const scenes = Array.from(xmlDoc.getElementsByTagName('scene'))
  if (scenes.length === 0) return ''

  type Entry = {
    yakuText: string
    bookChapter: string
    verse: string
    message: string
  }
  const entries: Entry[] = []

  scenes.forEach((scene) => {
    const yakuText = scene.getAttribute('YakuText') || ''
    const positionText = scene.getAttribute('PositionText') || ''
    const mainMessage = scene.getAttribute('MainMessage') || ''
    if (!positionText || !mainMessage) return

    const decodedPosition = decodeEntities(positionText)
    const normalized = decodedPosition.replace(/\s+/g, ' ').trim()
    const match = normalized.match(/^(.*?)[：:]\s*(\d+)\s*$/)
    const bookChapter = match ? match[1] : normalized
    const verse = match ? match[2] : ''
    const decodedMessage = decodeEntities(mainMessage).trim()
    if (!decodedMessage) return

    entries.push({ yakuText, bookChapter, verse, message: decodedMessage })
  })

  if (!entries.length) return ''

  const output: string[] = []
  let currentYaku = ''
  let firstInYaku = true
  let i = 0

  while (i < entries.length) {
    const yakuText = entries[i].yakuText || ''
    if (yakuText && yakuText !== currentYaku) {
      if (output.length) output.push('')
      output.push(yakuText)
      currentYaku = yakuText
      firstInYaku = true
    }

    const bookChapter = entries[i].bookChapter
    const section: Entry[] = []
    while (
      i < entries.length &&
      entries[i].bookChapter === bookChapter &&
      (entries[i].yakuText || '') === yakuText
    ) {
      section.push(entries[i])
      i += 1
    }

    if (!firstInYaku) output.push('')
    firstInYaku = false

    const verses = section.map((e) => e.verse).filter(Boolean)
    const header =
      verses.length > 0
        ? `${bookChapter}:${verses[0]}${verses.length > 1 ? `-${verses[verses.length - 1]}` : ''}`
        : bookChapter
    output.push(header)

    if (section.length === 1) {
      output.push(section[0].message)
    } else {
      section.forEach((entry) => {
        output.push(entry.verse ? `${entry.verse}. ${entry.message}` : entry.message)
      })
    }
  }

  return output.join('\n')
}
