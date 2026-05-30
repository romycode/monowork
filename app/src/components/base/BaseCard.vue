<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <div class="base-card" :class="{ 'base-card--padded': padded }">
    <slot />
  </div>
</template>

<style scoped>
.base-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.base-card--padded {
  padding: 1.25rem;
}
</style>
