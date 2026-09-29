export const clientSectionPath = (id, section, search = '', hash = '') =>
  `/clients/${id}/${section}${search}${hash}`

export function loadProgressPath(id, search = '', hash = '') {
  const params = new URLSearchParams(search)
  if (params.get('view') === 'load') params.delete('view')
  if (params.get('tab') === 'objective') params.delete('tab')
  const remaining = params.toString()
  return clientSectionPath(id, 'progress', remaining ? `?${remaining}` : '', hash || '#training-load')
}

export function assessmentCanonicalPath(id, type, pathname, search = '', hash = '') {
  const section = type === 'goals' || type === 'lifestyle' ? 'profile' : 'assessments'
  return pathname.includes(`/clients/${id}/${section}/`) ? null : clientSectionPath(id, `${section}/${type}`, search, hash)
}
