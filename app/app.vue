<template>
  <BNavbar variant="primary" v-b-color-mode="'dark'" class="mb-4 shadow-sm">
      <BNavbarBrand to="/">GenderCareMap</BNavbarBrand>

      <BNavbarNav>
        <ClientOnly>
          <BNavItem>
            <ThemeSwitcher />
          </BNavItem>
      <BNavItem :to="user ? '/profile' : '/login'">
          <img
            v-if="user && user?.avatar_path"
            :src="`/avatars/${user.avatar_path}`"
            alt="Profile"
            class="rounded-circle border"
            style="width: 30px; height: 30px; object-fit: cover;"
          >

          <div v-else>
            <span v-if="!user">Login</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="bi bi-person"
              viewBox="0 0 16 16"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
            </svg>
          </div>
        </BNavItem>
        </ClientOnly>
      </BNavbarNav>
  </BNavbar>

  <BContainer>
    <NuxtPage />
  </BContainer>

</template>

<script setup>
const { fetchUser } = useAuth();

await fetchUser();

const { user } = useAuth();
</script>

<style>
:root {
  /* Core Primary */
  --bs-primary: #8b5cf6;
  --bs-primary-rgb: 139, 92, 246;

  /* Subtle Backgrounds (Used for light backgrounds/highlights) */
  --bs-primary-bg-subtle: #f5f3ff;

  /* Borders (Used for borders of primary elements) */
  --bs-primary-border-subtle: #ddd6fe;

  /* Text Emphasis (Used for high-contrast text) */
  --bs-primary-text-emphasis: #5b21b6;
}

[data-bs-theme="dark"] {
  /* Dark mode variants for better contrast */
  --bs-primary-bg-subtle: #2e1065;
  --bs-primary-border-subtle: #4c1d95;
  --bs-primary-text-emphasis: #d8b4fe;
}
</style>