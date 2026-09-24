export const clientSectionPath = (id, section, search = '', hash = '') =>
  `/clients/${id}/${section}${search}${hash}`

export function assessmentCanonicalPath(id, type, pathname, search = '', hash = '') {
  const section = type === 'goals' || type === 'lifestyle' ? 'profile' : 'assessments'
  return pathname.includes(`/clients/${id}/${section}/`) ? null : clientSectionPath(id, `${section}/${type}`, search, hash)
}
