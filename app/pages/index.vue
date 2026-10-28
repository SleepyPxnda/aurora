<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const creating = ref(false)
const error = ref(false)
const roomLink = ref('')
const adminLink = ref('')
const copied = ref('')

async function createRoom() {
  creating.value = true
  error.value = false
  try {
    const { roomId, adminToken } = await $fetch<{ roomId: string, adminToken: string }>('/api/rooms', { method: 'POST' })
    roomLink.value = `${location.origin}/r/${roomId}`
    adminLink.value = `${roomLink.value}#admin=${adminToken}`
  } catch {
    error.value = true
  } finally {
    creating.value = false
  }
}

async function copy(id: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = id
}
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 p-6">
    <h1 class="text-2xl font-semibold">aurora</h1>
    <Button v-if="!roomLink" :disabled="creating" class="self-start" @click="createRoom">Raum anlegen</Button>
    <Alert v-if="error" variant="destructive">
      <AlertDescription>Der Raum konnte nicht angelegt werden. Versuch es noch einmal.</AlertDescription>
    </Alert>
    <template v-if="roomLink">
      <div class="flex flex-col gap-2">
        <Label for="room-link">Raum-Link für das Team</Label>
        <div class="flex gap-2">
          <Input id="room-link" :model-value="roomLink" readonly />
          <Button variant="outline" @click="copy('room', roomLink)">{{ copied === 'room' ? 'Kopiert' : 'Kopieren' }}</Button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="admin-link">Admin-Link für dich</Label>
        <div class="flex gap-2">
          <Input id="admin-link" :model-value="adminLink" readonly />
          <Button variant="outline" @click="copy('admin', adminLink)">{{ copied === 'admin' ? 'Kopiert' : 'Kopieren' }}</Button>
        </div>
      </div>
      <Alert>
        <AlertDescription>Behalte den Admin-Link für dich. Er lässt sich nicht wiederherstellen.</AlertDescription>
      </Alert>
      <Button as="a" :href="adminLink" class="self-start">Raum öffnen</Button>
    </template>
  </main>
</template>
