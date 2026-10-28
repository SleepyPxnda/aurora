<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const route = useRoute()
const roomId = String(route.params.roomId)
const { docs, status, admin, writeDoc, mergeDoc, deleteDoc } = useRoom(roomId)
const displayName = useDisplayName()

const nameInput = ref('')
const nameError = ref(false)
function submitName() {
  nameError.value = !displayName.save(nameInput.value)
}
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 p-6">
    <template v-if="status === 'missing'">
      <Alert variant="destructive">
        <AlertDescription>Diesen Raum gibt es nicht. Prüf den Link.</AlertDescription>
      </Alert>
      <NuxtLink to="/" class="underline">Neuen Raum anlegen</NuxtLink>
    </template>

    <template v-else-if="status === 'ok' && displayName.ready.value">
      <form v-if="!displayName.name.value" class="flex flex-col gap-2" @submit.prevent="submitName">
        <Label for="display-name">Dein Anzeigename</Label>
        <Input id="display-name" v-model="nameInput" />
        <p v-if="nameError" role="alert" class="text-sm text-destructive">Bitte gib 1 bis 40 Zeichen ein.</p>
        <Button type="submit" class="self-start">Weiter</Button>
      </form>

      <template v-else>
        <p v-if="admin === 'ok'" class="font-medium">Moderation</p>
        <Alert v-if="admin === 'invalid'">
          <AlertDescription>Admin-Link ungültig. Du bist als Teilnehmer:in im Raum.</AlertDescription>
        </Alert>
        <MissionStep :room-id="roomId" :docs="docs" :merge-doc="mergeDoc" :write-doc="writeDoc" :delete-doc="deleteDoc" />
      </template>
    </template>
  </main>
</template>
