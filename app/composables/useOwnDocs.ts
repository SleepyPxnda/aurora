export interface OwnDocs { claims: string[], votes: string[] }

const strings = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null)

export function parseOwnDocs(raw: string | null): OwnDocs {
  try {
    const o = JSON.parse(raw ?? '')
    const claims = strings(o?.claims)
    const votes = strings(o?.votes)
    if (claims && votes) return { claims, votes }
  } catch { /* invalid */ }
  return { claims: [], votes: [] }
}

export function useOwnDocs(roomId: string) {
  const key = `aurora.own.${roomId}`
  const own = ref<OwnDocs>({ claims: [], votes: [] })

  onMounted(() => {
    try { own.value = parseOwnDocs(localStorage.getItem(key)) } catch { /* storage unavailable */ }
  })

  function update(fn: (o: OwnDocs) => OwnDocs) {
    own.value = fn(own.value)
    try { localStorage.setItem(key, JSON.stringify(own.value)) } catch { /* keep in memory */ }
  }

  return { own, update }
}
