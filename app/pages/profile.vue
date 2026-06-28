<template>
  <BContainer class="mt-5">
    <BCard title="Your Profile" class="shadow-sm">
      <div class="d-flex align-items-center mb-4">
        <img
          :src="user?.avatar_path ? `/storage/avatars/${user.avatar_path}` : '/person.svg'"
          class="rounded-circle border"
          style="width: 80px; height: 80px; object-fit: cover;"
        />
        <div class="ms-3">
          <h5>{{ user?.email }}</h5>
          <p class="text-muted mb-0">Role: {{ user?.role }}</p>
        </div>
      </div>

      <hr />

      <BForm @submit.prevent="uploadAvatar">
        <BAlert
          v-model="showError"
          variant="danger"
          dismissible
          class="mb-3"
          @closed="errorMessage = ''"
        >
          {{ errorMessage }}
        </BAlert>

        <BFormGroup label="Change Avatar" class="mb-3">
          <BFormFile
            v-model="file"
            accept="image/*"
            placeholder="Choose a file..."
            @change="handleFileChange"
          />
        </BFormGroup>
      </BForm>

      <BButton variant="outline-warning" class="mt-3" @click="logout">Log Out</BButton>

      <div class="mt-5">
        <BButton variant="outline-danger" @click="showDeleteModal = true">
          Delete My Account
        </BButton>
      </div>
    </BCard>

    <BModal
      v-model="showDeleteModal"
      title="Delete Account"
      ok-variant="danger"
      ok-title="Yes, Permanently Delete"
      @ok="handleDelete"
    >
      <p class="text-danger fw-bold">Warning: This action cannot be undone.</p>
      <p>This will anonymize your profile. Your contributions (resources and reviews) will remain on the map but will no longer be associated with your email or name.</p>
    </BModal>
  </BContainer>
</template>

<script setup>
const file = ref(null);
const uploading = ref(false);
const { user, refreshUser, logout } = useAuth();

const showDeleteModal = ref(false)
const loading = ref(false)

const errorMessage = ref('')
const showError = computed({
  get: () => errorMessage.value !== '',
  set: (val) => { if (!val) errorMessage.value = '' }
})

function handleFileChange(event) {
  if(event?.files){
    file.value = event.files[0];
    uploadAvatar();
  }
}

async function uploadAvatar() {
  if (!file.value) return;
  uploading.value = true;
  errorMessage.value = ''

  const formData = new FormData();
  formData.append('avatar', file.value);

  try{
    await $fetch('/api/auth/avatar', {
      method: 'POST',
      body: formData
    });

    file.value = null;
  }catch(error){
    errorMessage.value = error.data
  }

  uploading.value = false;
  refreshUser();
}

async function handleDelete() {
  loading.value = true

  try {
    const res = await $fetch('/api/auth/delete', {
      method: 'DELETE'
    })

    if (res.success) {
      // 1. Clear local auth state
      logout();

      // 2. Redirect to home page
      await navigateTo('/');

      // 3. Show success toast (optional)
      alert("Account deleted successfully.")
    }
  } catch (error) {
    console.error('Delete failed:', error)
    alert("An error occurred. Please try again.")
  } finally {
    loading.value = false
  }
}
</script>