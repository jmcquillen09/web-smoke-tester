// Whether an answer's media type is one the document declares: the same type, or a declared range
// (`application/*`, `*/*`) that holds it.
export const isDeclaredContentType = (contentType: string, declared: string): boolean => {
  const [declaredMediaType = ''] = declared.toLowerCase().split(';')
  const [declaredType = '', declaredSubtype = ''] = declaredMediaType.trim().split('/')
  const [type = '', subtype = ''] = contentType.split('/')
  const hasMediaType = type !== '' && subtype !== ''
  const isSameType = declaredType === '*' || declaredType === type
  const isSameSubtype = declaredSubtype === '*' || declaredSubtype === subtype
  return hasMediaType && isSameType && isSameSubtype
}
