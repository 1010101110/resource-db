<template>
  <div class="form-container">
    <h1>Add a Resource</h1>
    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success-box">{{ successMsg }}</div>

    <ResourceForm
      v-if="!successMsg"
      :loading="loading"
      submitLabel="Add Resource"
      @submit="submitResource"
      @error="handleError"
    />
  </div>
</template>

<script setup>
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function handleError(msg) { errorMsg.value = msg; }

async function submitResource(payload) {
  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await $fetch('/api/resources', { method: 'POST', body: payload });
    if (res.success) successMsg.value = res.message;
  } catch (err) {
    errorMsg.value = err.data?.statusMessage || 'An error occurred.';
  } finally {
    loading.value = false;
  }
}
</script>