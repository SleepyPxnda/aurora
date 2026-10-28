const KEY = 'aurora.displayName'

export function validateDisplayName(input: string): string | null {
  const name = input.trim()
  return name.length >= 1 && name.length <= 40 ? name : null
}

export function useDisplayName() {
  const name = ref<string | null>(null)
  const ready = ref(false)

  onMounted(() => {
    try {
      name.value = validateDisplayName(localStorage.getItem(KEY) ?? '')
    } catch { /* storage unavailable */ }
    ready.value = true
  })

  function save(input: string): boolean {
    const valid = validateDisplayName(input)
    if (!valid) return false
    try { localStorage.setItem(KEY, valid) } catch { /* keep in memory */ }
    name.value = valid
    return true
  }

  return { name, ready, save }
}
