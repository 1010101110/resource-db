<template>
  <div class="login-container">
    <h1>Log In or Sign Up</h1>
    <p>Enter your email and we'll send you a magic link to log in instantly. No passwords required.</p>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success">{{ successMsg }}</div>

    <form @submit.prevent="requestLogin" v-if="!successMsg">
      <input
        type="email"
        v-model="email"
        placeholder="your@email.com"
        required
        :disabled="loading"
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Magic Link' }}
      </button>
    </form>
  </div>
</template>

<script setup>
const email = ref('');
const loading = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const route = useRoute();

// Handle errors from the verify redirect
onMounted(() => {
  if (route.query.error === 'InvalidOrExpired') {
    errorMsg.value = 'That login link was invalid or has expired. Please request a new one.';
  }
  if(route.query.warn === 'required'){
    errorMsg.value = 'You must login to do that.';
  }
});

const requestLogin = async () => {
  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value }
    });
    successMsg.value = res.message;
  } catch (err) {
    errorMsg.value = err.data?.statusMessage || 'Something went wrong.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 4rem auto;
  font-family: sans-serif;
}
input, button {
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
}
.error { color: red; margin-top: 1rem; }
.success { color: green; margin-top: 1rem; }
</style>