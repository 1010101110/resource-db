<template>
  <ClientOnly>
    <BButton
      @click="toggleTheme"
      class="theme-btn p-0"
      title="Toggle Theme"
      variant="outline-secondary"
    >
      {{ $colorMode.value === 'dark' ? '☀️' : '🌙' }}
    </BButton>
  </ClientOnly>
</template>

<script setup>
const colorMode = useColorMode()

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-bs-theme', colorMode.preference)
}
</script>

<style scoped>
.theme-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  transition: all 0.2s ease-in-out;
}
</style>