import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, usersApi } from '~/lib/api'
import type { CreateUserInput, UpdateUserInput, User } from '~/lib/api'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function toMessage(err: unknown): string {
    if (err instanceof ApiError) return err.message
    if (err instanceof Error) return err.message
    return 'Something went wrong'
  }

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await usersApi.list()
    } catch (err) {
      error.value = toMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createUser(input: CreateUserInput): Promise<boolean> {
    error.value = null
    try {
      const user = await usersApi.create(input)
      users.value = [...users.value, user]
      return true
    } catch (err) {
      error.value = toMessage(err)
      return false
    }
  }

  async function updateUser(id: string, input: UpdateUserInput): Promise<boolean> {
    error.value = null
    try {
      const updated = await usersApi.update(id, input)
      users.value = users.value.map((user) => (user.id === id ? updated : user))
      return true
    } catch (err) {
      error.value = toMessage(err)
      return false
    }
  }

  async function deleteUser(id: string): Promise<boolean> {
    error.value = null
    try {
      await usersApi.remove(id)
      users.value = users.value.filter((user) => user.id !== id)
      return true
    } catch (err) {
      error.value = toMessage(err)
      return false
    }
  }

  return { users, loading, error, fetchUsers, createUser, updateUser, deleteUser }
})
