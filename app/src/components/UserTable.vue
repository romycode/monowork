<script setup lang="ts">
import type { User } from '~/lib/api'

defineProps<{ users: User[] }>()

const emit = defineEmits<{
  edit: [user: User]
  remove: [user: User]
}>()

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}
</script>

<template>
  <table class="user-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Created</th>
        <th class="actions-col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
        <td>{{ formatDate(user.createdAt) }}</td>
        <td class="actions-col">
          <button type="button" @click="emit('edit', user)">Edit</button>
          <button type="button" class="danger" @click="emit('remove', user)">Delete</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.user-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

th,
td {
  padding: 0.625rem 0.875rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

tbody tr:last-child td {
  border-bottom: none;
}

.actions-col {
  text-align: right;
  white-space: nowrap;
}

button {
  padding: 0.3rem 0.6rem;
  margin-left: 0.375rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

button.danger {
  border-color: #fecaca;
  color: #dc2626;
}
</style>
