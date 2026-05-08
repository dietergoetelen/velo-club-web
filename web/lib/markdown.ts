/** Flatten markdown to a single-line plain string — for previews/clamps. */
export function markdownToPreview(md: string): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')               // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')     // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links → text
    .replace(/^#{1,6}\s+/gm, '')               // headings
    .replace(/^>\s+/gm, '')                    // blockquotes
    .replace(/^[-*+]\s+/gm, '')                // bullets
    .replace(/^\d+\.\s+/gm, '')                // ordered lists
    .replace(/(\*\*|__)(.+?)\1/g, '$2')        // bold
    .replace(/(\*|_)(.+?)\1/g, '$2')           // italic
    .replace(/~~(.+?)~~/g, '$1')               // strikethrough
    .replace(/\r?\n+/g, ' ')                   // newlines → space
    .replace(/\s+/g, ' ')                      // collapse whitespace
    .trim();
}
