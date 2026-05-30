<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
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
  <BaseCard>
    <form class="user-form" @submit.prevent="onSubmit">
      <h2 class="user-form__title">{{ isEditing ? 'Edit user' : 'Add user' }}</h2>

      <BaseInput v-model="form.name" label="Name" name="name" placeholder="Ada Lovelace" required />
      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        name="email"
        placeholder="ada@example.com"
        required
      />
      <BaseInput
        v-model="form.password"
        label="Password"
        type="password"
        name="password"
        :placeholder="isEditing ? 'Leave blank to keep current' : 'At least 8 characters'"
        :required="!isEditing"
        :minlength="8"
      />

      <div class="user-form__actions">
        <BaseButton type="submit" :disabled="!canSubmit">
          {{ isEditing ? 'Save changes' : 'Create user' }}
        </BaseButton>
        <BaseButton v-if="isEditing" variant="secondary" type="button" @click="emit('cancel')">
          Cancel
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>

<style scoped>
.user-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-form__title {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.user-form__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
