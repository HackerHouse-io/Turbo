import React from 'react'

// Converts inline markdown to React nodes:
// **bold**, *italic*, `code`, [text](url)
export function formatInline(text: string): React.ReactNode {
  if (!text) return text

  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/)
    // Inline code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`/)
    // Italic *text* (not **)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    // Link [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)/)

    // Find earliest match
    type Match = { type: string; index: number; match: RegExpMatchArray }
    const matches: Match[] = []
    if (boldMatch) matches.push({ type: 'bold', index: boldMatch[1].length, match: boldMatch })
    if (codeMatch) matches.push({ type: 'code', index: codeMatch[1].length, match: codeMatch })
    if (italicMatch && (!boldMatch || italicMatch[1].length < boldMatch[1].length))
      matches.push({ type: 'italic', index: italicMatch[1].length, match: italicMatch })
    if (linkMatch) matches.push({ type: 'link', index: linkMatch[1].length, match: linkMatch })

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    matches.sort((a, b) => a.index - b.index)
    const first = matches[0]

    // Add text before match
    if (first.match[1]) {
      parts.push(first.match[1])
    }

    switch (first.type) {
      case 'bold':
        parts.push(<strong key={key++} className="font-semibold">{first.match[2]}</strong>)
        remaining = remaining.slice(first.match[0].length)
        break
      case 'code':
        parts.push(
          <code key={key++} className="px-1 py-0.5 rounded bg-white/10 text-turbo-accent text-[0.9em] font-mono">
            {first.match[2]}
          </code>
        )
        remaining = remaining.slice(first.match[0].length)
        break
      case 'italic':
        parts.push(<em key={key++} className="italic">{first.match[2]}</em>)
        remaining = remaining.slice(first.match[0].length)
        break
      case 'link':
        parts.push(
          <a
            key={key++}
            href={first.match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-turbo-accent underline underline-offset-2 hover:brightness-125"
            onClick={e => e.stopPropagation()}
          >
            {first.match[2]}
          </a>
        )
        remaining = remaining.slice(first.match[0].length)
        break
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}
