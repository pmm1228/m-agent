<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  alt?: string
}>(), {
  size: 32,
  alt: 'mAgent'
})
</script>

<template>
  <img
    class="app-logo"
    src="/logo.svg"
    :alt="alt"
    :width="size"
    :height="size"
    decoding="async"
  >
</template>

<style scoped>
.app-logo {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
