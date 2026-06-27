// composables/useAuth.ts
export const useAuth = () => {
  // 1. Create a global, SSR-friendly reactive state
  const user = useState('user-profile', () => null);

  // 2. Create a computed property for easy boolean checks
  const isLoggedIn = computed(() => !!user.value);

  // 3. The function to actually fetch the data from your API
  const fetchUser = async () => {
    const { data } = await useFetch('/api/auth/me', {
      // We don't necessarily need a key here because useState handles the caching
      server: true
    });

    // Update the global state
    user.value = data.value?.user || null;
  };

  const refreshUser = async() => {
    const {user : me} = await $fetch('/api/auth/me')
    user.value = me || null;
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });

      user.value = null;

      await navigateTo('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return {
    user,
    isLoggedIn,
    fetchUser,
    refreshUser,
    logout
  };
};