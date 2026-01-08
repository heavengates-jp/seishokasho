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

  const output: string[] = []
  let previousShouIndex = ''
  let previousYakuText = ''

  scenes.forEach((scene) => {
    const yakuText = scene.getAttribute('YakuText') || ''
    const shouIndex = scene.getAttribute('ShouIndex') || ''
    const positionText = scene.getAttribute('PositionText') || ''
    const mainMessage = scene.getAttribute('MainMessage') || ''

    if (shouIndex !== previousShouIndex) {
      if (output.length) output.push('')
      if (yakuText) output.push(yakuText)
      previousShouIndex = shouIndex
      previousYakuText = yakuText
    } else if (yakuText && yakuText !== previousYakuText) {
      output.push(yakuText)
      previousYakuText = yakuText
    }

    if (positionText || mainMessage) {
      const decodedPosition = decodeEntities(positionText)
      const decodedMessage = decodeEntities(mainMessage)
      output.push(`${decodedPosition}\n  ${decodedMessage}`.trimEnd())
    }
  })

  return output.join('\n')
}
