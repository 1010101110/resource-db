<template>
  <BForm @submit.prevent="handleSubmit">
    <BFormGroup label="Resource Name *" label-for="input-name" class="mb-3">
      <BFormInput id="input-name" v-model="form.name" type="text" required />
    </BFormGroup>

    <BFormGroup label="Category *" label-for="input-category" class="mb-3">
      <BFormSelect
        id="input-category"
        v-model="form.category"
        :options="categoryOptions"
        required
      />
    </BFormGroup>

    <BFormGroup label="Location (Address, City, or ZIP) *" label-for="input-address" class="mb-3">
      <BFormInput id="input-address" v-model="form.address" type="text" required placeholder="123 Streety st. Pleasantville OK 12345" />
    </BFormGroup>

    <BFormGroup label="Description" label-for="input-description" class="mb-3">
      <BFormTextarea id="input-description" v-model="form.description" rows="4" />
    </BFormGroup>

    <BRow class="mb-3">
      <BCol md="6" class="mb-3 mb-md-0">
        <BFormGroup label="Website" label-for="input-website">
          <BFormInput id="input-website" v-model="form.website" type="url" />
        </BFormGroup>
      </BCol>
      <BCol md="6">
        <BFormGroup label="Phone" label-for="input-phone">
          <BFormInput id="input-phone" v-model="form.phone" type="tel" />
        </BFormGroup>
      </BCol>
    </BRow>

    <BButton type="submit" variant="primary" :disabled="loading" class="w-100 mt-2">
      <BSpinner v-if="loading" small class="me-2" />
      {{ loading ? 'Processing...' : submitLabel }}
    </BButton>
  </BForm>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
  loading: Boolean,
  submitLabel: { type: String, default: 'Save Resource' }
});

const emit = defineEmits(['submit', 'error']);

// Initialize form state
const form = ref({
  name: '', category: '', address: '', description: '', website: '', phone: ''
});

// BootstrapVueNext prefers an array of options for BFormSelect
const categoryOptions = [
  { value: '', text: 'Select a category...', disabled: true },
  { value: 'Healthcare', text: 'Healthcare / HRT' },
  { value: 'Surgeon', text: 'Surgeon' },
  { value: 'Mental Health', text: 'Mental Health / Therapy' },
  { value: 'Support Group', text: 'Support Group' },
  { value: 'Legal Aid', text: 'Legal Aid / Name Change' },
  { value: 'Vendor', text: 'Vendor / Service' },
  { value: 'Safe Space', text: 'Community / Org / Safe Space' },
  { value: 'Other', text: 'Other' }
];

// If editing, populate the form with existing data
watch(() => props.initialData, (newData) => {
  if (newData && Object.keys(newData).length > 0) {
    form.value = { ...form.value, ...newData };
  }
}, { immediate: true });

async function handleSubmit() {
  try {
    // Geocode the address before emitting
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(form.value.address)}`
    );
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      emit('error', 'Location not found. Try a more specific address.');
      return;
    }

    const payload = {
      ...form.value,
      latitude: parseFloat(geoData[0].lat),
      longitude: parseFloat(geoData[0].lon)
    };

    emit('submit', payload);
  } catch (error) {
    emit('error', 'Geocoding failed.');
  }
}
</script>

<style scoped>
/* All the custom input, button, and flexbox styles have been removed!
  Bootstrap utility classes (mb-3, w-100, mt-2) and the grid system (BRow, BCol)
  handle all the spacing and layout automatically.
*/

.error-box { padding: 1rem; background: #fee2e2; color: #b91c1c; border-radius: 6px; margin-bottom: 1rem; }
.success-box { padding: 1rem; background: #dcfce3; color: #15803d; border-radius: 6px; margin-bottom: 1rem; }
.success-box a { color: #166534; font-weight: bold; margin-left: 1rem; }
</style>