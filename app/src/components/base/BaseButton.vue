<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'
    size?: 'medium' | 'small'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'medium', type: 'button', disabled: false },
)
</script>

<template>
  <button
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button--medium {
  padding: 0.5rem 0.875rem;
  font-size: 0.9rem;
}

.base-button--small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.base-button--primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.base-button--secondary {
  background: var(--color-secondary);
  color: var(--color-secondary-text);
}

.base-button--outline {
  background: var(--color-surface);
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.base-button--danger {
  background: var(--color-surface);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}
</style>
