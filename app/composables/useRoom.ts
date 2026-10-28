type Docs = Record<string, Record<string, Record<string, unknown>>>
type AdminState = 'none' | 'checking' | 'ok' | 'invalid'

const POLL_MS = 3000

export function useRoom(roomId: string) {
  const docs = ref<Docs>({})
  const status = ref<'loading' | 'ok' | 'missing'>('loading')
  const admin = ref<AdminState>('none')
  let timer: ReturnType<typeof setInterval> | undefined

  async function refresh() {
    try {
      const res = await $fetch<{ docs: Docs }>(`/api/rooms/${roomId}`)
      docs.value = res.docs
      status.value = 'ok'
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 404) {
        status.value = 'missing'
        clearInterval(timer)
      }
    }
  }

  async function verifyAdmin() {
    const token = new URLSearchParams(location.hash.slice(1)).get('admin')
    if (!token) return
    admin.value = 'checking'
    try {
      await $fetch(`/api/rooms/${roomId}/admin`, { method: 'POST', headers: { 'x-admin-token': token } })
      admin.value = 'ok'
    } catch {
      admin.value = 'invalid'
    }
  }

  async function writeDoc(collection: string, docId: string, body: Record<string, unknown>) {
    await $fetch(`/api/rooms/${roomId}/docs/${collection}/${docId}`, { method: 'PUT', body })
    await refresh()
  }

  onMounted(async () => {
    await refresh()
    if (status.value === 'ok') {
      verifyAdmin()
      timer = setInterval(refresh, POLL_MS)
    }
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { docs, status, admin, writeDoc }
}
