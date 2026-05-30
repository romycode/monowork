<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import UserForm from '~/components/UserForm.vue'
import UserTable from '~/components/UserTable.vue'
import { useUsersStore } from '~/stores/users'
import type { User } from '~/lib/api'

const store = useUsersStore()
const { users, loading, error } = storeToRefs(store)

const editing = ref<User | null>(null)

onMounted(() => store.fetchUsers())

async function onSubmit(payload: { email: string; name: string; password: string }) {
  const current = editing.value
  if (current) {
    const patch: { email: string; name: string; password?: string } = {
      email: payload.email,
      name: payload.name,
    }
    if (payload.password !== '') patch.password = payload.password
    const ok = await store.updateUser(current.id, patch)
    if (ok) editing.value = null
  } else {
    await store.createUser(payload)
  }
}

function onEdit(user: User) {
  editing.value = user
}

function onCancel() {
  editing.value = null
}

async function onRemove(user: User) {
  if (!confirm(`Delete ${user.name}?`)) return
  const ok = await store.deleteUser(user.id)
  if (ok && editing.value?.id === user.id) editing.value = null
}
</script>

<template>
  <section class="dashboard">
    <header>
      <h1>User Management</h1>
      <p>{{ users.length }} {{ users.length === 1 ? 'user' : 'users' }}</p>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="layout">
      <div class="list">
        <p v-if="loading" class="muted">Loading users…</p>
        <p v-else-if="users.length === 0" class="muted">No users yet. Add one to get started.</p>
        <UserTable v-else :users="users" @edit="onEdit" @remove="onRemove" />
      </div>

      <aside class="form">
        <UserForm :editing="editing" @submit="onSubmit" @cancel="onCancel" />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
}

header p {
  margin: 0;
  color: #64748b;
}

.layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.error {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.muted {
  color: #94a3b8;
  padding: 1rem;
}
</style>
