import fsDriver from 'unstorage/drivers/fs'

// Mount at runtime so NUXT_DATA_DIR on the running container takes effect (not fixed at build time).
export default defineNitroPlugin(() => {
  useStorage().mount('rooms', fsDriver({ base: useRuntimeConfig().dataDir }))
})
