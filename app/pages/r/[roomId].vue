<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const route = useRoute()
const roomId = String(route.params.roomId)
const { docs, status, admin, writeDoc } = useRoom(roomId)
const displayName = useDisplayName()

const nameInput = ref('')
const nameError = ref(false)
function submitName() {
  nameError.value = !displayName.save(nameInput.value)
}

const system = ref('')
const editing = ref(false)
const remoteSystem = computed(() => String(docs.value.review?.main?.system ?? ''))
watch(remoteSystem, (v) => { if (!editing.value) system.value = v }, { immediate: true })

async function saveSystem() {
  editing.value = false
  await writeDoc('review', 'main', { system: system.value })
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
        <div class="flex flex-col gap-2">
          <Label for="system">Name des Systems</Label>
          <Input id="system" v-model="system" @focus="editing = true" @blur="saveSystem" />
        </div>
      </template>
    </template>
  </main>
</template>
