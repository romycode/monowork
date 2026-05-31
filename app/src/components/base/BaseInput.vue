<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    type?: string
    name?: string
    placeholder?: string
    required?: boolean
    minlength?: number
  }>(),
  { type: 'text', required: false },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="base-input">
    <span class="base-input__label">{{ label }}</span>
    <input
      v-model="model"
      class="base-input__field"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :required="required"
      :minlength="minlength"
    />
  </label>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-label);
}

.base-input__field {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius);
  font-size: 0.9rem;
}
</style>
