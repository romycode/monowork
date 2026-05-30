<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
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
  <BaseCard :padded="false">
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
            <BaseButton variant="outline" size="small" @click="emit('edit', user)">
              Edit
            </BaseButton>
            <BaseButton variant="danger" size="small" @click="emit('remove', user)">
              Delete
            </BaseButton>
          </td>
        </tr>
      </tbody>
    </table>
  </BaseCard>
</template>

<style scoped>
.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table__header,
.user-table__cell {
  padding: 0.625rem 0.875rem;
  text-align: left;
  border-bottom: 1px solid var(--color-row-border);
  font-size: 0.9rem;
}

.user-table__header {
  background: var(--color-header-bg);
  color: var(--color-label);
  font-weight: 600;
}

.user-table__row:last-child .user-table__cell {
  border-bottom: none;
}

.user-table__header--actions {
  text-align: right;
  white-space: nowrap;
}

.user-table__cell--actions {
  display: flex;
  gap: 0.375rem;
  justify-content: flex-end;
}
</style>
