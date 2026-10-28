<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  activeVotes, countVotes, createDocId, listClaims, MSCHECK_QUESTIONS, remainingVotes, TOP_GROUP_SIZE,
  topClaimIds, validateClaim, VOTES_PER_PERSON, type VoteDocs,
} from '@/lib/mission'

type Docs = Record<string, Record<string, Record<string, unknown>>>
const props = defineProps<{
  roomId: string
  docs: Docs
  mergeDoc: (c: string, id: string, body: Record<string, unknown>) => Promise<void>
  writeDoc: (c: string, id: string, body: Record<string, unknown>) => Promise<void>
  deleteDoc: (c: string, id: string) => Promise<void>
}>()

const { own, update } = useOwnDocs(props.roomId)
const failed = ref(false)

async function run(fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    failed.value = false
    return true
  } catch {
    failed.value = true
    return false
  }
}

// Frame fields: remote changes never overwrite a focused field.
const review = computed(() => props.docs.review?.main ?? {})
const fields = reactive({ system: '', inScope: '', outScope: '' })
type Field = keyof typeof fields
const focused = ref<Field | null>(null)
for (const k of Object.keys(fields) as Field[]) {
  watch(() => String(review.value[k] ?? ''), (v) => { if (focused.value !== k) fields[k] = v }, { immediate: true })
}
async function saveField(k: Field) {
  focused.value = null
  await run(() => props.mergeDoc('review', 'main', { [k]: fields[k] }))
}

// Claims and votes
const claims = computed(() => listClaims(props.docs.claims as never))
const votes = computed(() => (props.docs.votes ?? {}) as VoteDocs)
const counts = computed(() => countVotes(claims.value, votes.value))
const top = computed(() => topClaimIds(counts.value))
const active = computed(() => activeVotes(own.value.votes, claims.value, votes.value))
const remaining = computed(() => remainingVotes(active.value))
const myVoteFor = (claimId: string) => active.value.find((v) => v.claimId === claimId)

const claimText = ref('')
const claimError = ref(false)
async function addClaim() {
  const text = validateClaim(claimText.value)
  claimError.value = !text
  if (!text) return
  const id = createDocId()
  if (await run(() => props.writeDoc('claims', id, { text, at: new Date().toISOString() }))) {
    update((o) => ({ ...o, claims: [...o.claims, id] }))
    claimText.value = ''
  }
}

async function removeClaim(claimId: string) {
  const voteIds = Object.entries(votes.value).filter(([, v]) => v.claimId === claimId).map(([id]) => id)
  const ok = await run(async () => {
    await props.deleteDoc('claims', claimId)
    for (const id of voteIds) await props.deleteDoc('votes', id)
  })
  if (ok) update((o) => ({ claims: o.claims.filter((c) => c !== claimId), votes: o.votes.filter((v) => !voteIds.includes(v)) }))
}

async function vote(claimId: string) {
  const id = createDocId()
  if (await run(() => props.writeDoc('votes', id, { claimId }))) update((o) => ({ ...o, votes: [...o.votes, id] }))
}
async function unvote(voteId: string) {
  if (await run(() => props.deleteDoc('votes', voteId))) update((o) => ({ ...o, votes: o.votes.filter((v) => v !== voteId) }))
}

// Checklist
const mscheck = computed(() => (review.value.mscheck ?? {}) as Record<string, boolean>)
const tick = (key: string, v: boolean | 'indeterminate') =>
  run(() => props.mergeDoc('review', 'main', { mscheck: { [key]: v === true } }))
</script>

<template>
  <section class="flex flex-col gap-6">
    <Alert v-if="failed" variant="destructive">
      <AlertDescription role="alert">Speichern fehlgeschlagen. Versuch es noch einmal.</AlertDescription>
    </Alert>

    <div class="flex flex-col gap-2">
      <Label for="system">Name des Systems</Label>
      <Input id="system" v-model="fields.system" @focus="focused = 'system'" @blur="saveField('system')" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="in-scope">Im Rahmen</Label>
      <Textarea id="in-scope" v-model="fields.inScope" maxlength="2000" @focus="focused = 'inScope'" @blur="saveField('inScope')" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="out-scope">Nicht im Rahmen</Label>
      <Textarea id="out-scope" v-model="fields.outScope" maxlength="2000" @focus="focused = 'outScope'" @blur="saveField('outScope')" />
    </div>

    <div class="flex flex-col gap-3">
      <h2 class="font-medium">Claims</h2>
      <form class="flex flex-col gap-2" @submit.prevent="addClaim">
        <Label for="claim">Neuer Claim</Label>
        <Input id="claim" v-model="claimText" />
        <p v-if="claimError" role="alert" class="text-sm text-destructive">Bitte gib 1 bis 140 Zeichen ein.</p>
        <Button type="submit" class="self-start">Hinzufügen</Button>
      </form>

      <p>
        Noch <span class="font-mono">{{ remaining }}</span> Stimmen
      </p>
      <p v-if="remaining === 0" class="text-sm">Du hast alle {{ VOTES_PER_PERSON }} Stimmen vergeben.</p>

      <ul class="flex flex-col gap-2">
        <li v-for="c in claims" :key="c.id" class="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span class="flex-1">{{ c.text }}</span>
          <Badge v-if="top.has(c.id)">Top {{ TOP_GROUP_SIZE }}</Badge>
          <span class="font-mono">{{ counts[c.id] }}</span>
          <Button v-if="myVoteFor(c.id)" variant="outline" size="sm" @click="unvote(myVoteFor(c.id)!.voteId)">Stimme zurücknehmen</Button>
          <Button v-else size="sm" :disabled="remaining === 0" @click="vote(c.id)">Stimme geben</Button>
          <Button v-if="own.claims.includes(c.id)" variant="ghost" size="sm" @click="removeClaim(c.id)">Löschen</Button>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-3">
      <h2 class="font-medium">Prüffragen</h2>
      <div v-for="q in MSCHECK_QUESTIONS" :key="q.key" class="flex items-center gap-2">
        <Checkbox :id="`mscheck-${q.key}`" :model-value="mscheck[q.key] === true" @update:model-value="tick(q.key, $event)" />
        <Label :for="`mscheck-${q.key}`">{{ q.text }}</Label>
      </div>
      <p class="text-sm text-muted-foreground">Fragen frei formuliert nach LASR, CC BY-SA 4.0.</p>
    </div>
  </section>
</template>
