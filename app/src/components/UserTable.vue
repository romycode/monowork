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
      <tr class="user-table__row">
        <th class="user-table__header">Name</th>
        <th class="user-table__header">Email</th>
        <th class="user-table__header">Created</th>
        <th class="user-table__header user-table__header--actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id" class="user-table__row">
        <td class="user-table__cell">{{ user.name }}</td>
        <td class="user-table__cell">{{ user.email }}</td>
        <td class="user-table__cell">{{ formatDate(user.createdAt) }}</td>
        <td class="user-table__cell user-table__cell--actions">
          <button class="user-table__button" type="button" @click="emit('edit', user)">Edit</button>
          <button
            class="user-table__button user-table__button--danger"
            type="button"
            @click="emit('remove', user)"
          >
            Delete
          </button>
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

.user-table__header,
.user-table__cell {
  padding: 0.625rem 0.875rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.user-table__header {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.user-table__row:last-child .user-table__cell {
  border-bottom: none;
}

.user-table__header--actions,
.user-table__cell--actions {
  text-align: right;
  white-space: nowrap;
}

.user-table__button {
  padding: 0.3rem 0.6rem;
  margin-left: 0.375rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.user-table__button--danger {
  border-color: #fecaca;
  color: #dc2626;
}
</style>
