import type { RouterConfig } from '@nuxt/schema'

// Never treat the admin token fragment as a scroll selector (it would be logged).
export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash && !to.hash.startsWith('#admin=')) return { el: to.hash }
    return { top: 0 }
  },
}
