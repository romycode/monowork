<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { User } from '~/lib/api'

type Payload = { email: string; name: string; password: string }

const props = defineProps<{ editing?: User | null }>()

const emit = defineEmits<{
  submit: [payload: Payload]
  cancel: []
}>()

const form = reactive<Payload>({ email: '', name: '', password: '' })

const isEditing = computed(() => props.editing != null)

watch(
  () => props.editing,
  (user) => {
    form.email = user?.email ?? ''
    form.name = user?.name ?? ''
    form.password = ''
  },
  { immediate: true },
)

const canSubmit = computed(() => {
  const hasIdentity = form.email.trim() !== '' && form.name.trim() !== ''
  // password is required to create, optional when editing
  return hasIdentity && (isEditing.value || form.password.length >= 8)
})

function onSubmit() {
  if (!canSubmit.value) return

  const payload: Payload = {
    email: form.email.trim(),
    name: form.name.trim(),
    password: form.password,
  }

  emit('submit', payload)

  if (!isEditing.value) {
    form.email = ''
    form.name = ''
    form.password = ''
  }
}
</script>

<template>
  <form class="user-form" @submit.prevent="onSubmit">
    <h2>{{ isEditing ? 'Edit user' : 'Add user' }}</h2>

    <label>
      <span>Name</span>
      <input v-model="form.name" type="text" name="name" placeholder="Ada Lovelace" required />
    </label>

    <label>
      <span>Email</span>
      <input
        v-model="form.email"
        type="email"
        name="email"
        placeholder="ada@example.com"
        required
      />
    </label>

    <label>
      <span>Password</span>
      <input
        v-model="form.password"
        type="password"
        name="password"
        :placeholder="isEditing ? 'Leave blank to keep current' : 'At least 8 characters'"
        :required="!isEditing"
        minlength="8"
      />
    </label>

    <div class="actions">
      <button type="submit" :disabled="!canSubmit">
        {{ isEditing ? 'Save changes' : 'Create user' }}
      </button>
      <button v-if="isEditing" type="button" class="secondary" @click="emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.user-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.user-form h2 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #475569;
}

input {
  padding: 0.5rem 0.625rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

button {
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.secondary {
  background: #e2e8f0;
  color: #1e293b;
}
</style>
