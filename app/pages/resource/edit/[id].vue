<template>
  <div class="form-container">
    <h1>Edit Resource</h1>
    <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success-box">{{ successMsg }}</div>

    <div v-if="fetching">Loading resource data...</div>

    <ResourceForm
      v-else-if="!successMsg"
      :initialData="existingData"
      :loading="loading"
      submitLabel="Update Resource"
      @submit="updateResource"
      @error="handleError"
    />
  </div>
</template>

<script setup>
const route = useRoute();
const resourceId = route.params.id;

const existingData = ref({});
const fetching = ref(true);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function handleError(msg) { errorMsg.value = msg; }

// Fetch the existing resource data when the page loads
onMounted(async () => {
  try {
    const res = await $fetch(`/api/resources/${resourceId}`);
    if (res.success) {
      existingData.value = res.data;
    }
  } catch (err) {
    errorMsg.value = 'Failed to load resource data.';
  } finally {
    fetching.value = false;
  }
});

async function updateResource(payload) {
  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await $fetch(`/api/resources/${resourceId}`, {
      method: 'PUT',
      body: payload
    });
    if (res.success) successMsg.value = res.message;
  } catch (err) {
    errorMsg.value = err.data?.statusMessage || 'An error occurred.';
  } finally {
    loading.value = false;
  }
}
</script>