<template>
  <BContainer class="mt-4">
    <div v-if="loading" class="text-center my-5">
      <BSpinner label="Loading details..." />
    </div>

    <div v-else-if="resource">
      <div class="resource-details-container">
        <!-- Header Section -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h1 class="mb-0 fw-bold">{{ resource.name }}</h1>
          <BBadge
            :variant="resource.average_rating > 0 ? 'warning' : 'secondary'"
            class="fs-6 text-dark"
          >
            {{ resource.average_rating > 0 ? `${resource.average_rating} ⭐` : 'No reviews' }}
          </BBadge>
        </div>

        <BBadge variant="info" class="mb-3 px-3 py-2">{{ resource.category }}</BBadge>

        <!-- Map Section -->
        <div id="resource-map" class="map-render-area mb-4 border rounded shadow-sm"></div>

        <!-- Details Section -->
        <div class="row g-4">
          <!-- Left Column: Description -->
          <div class="col-md-7">
            <h5 class="text-muted border-bottom pb-2 mb-3">About</h5>
            <p class="lh-lg" style="white-space: pre-wrap;">{{ resource.description }}</p>
          </div>

          <!-- Right Column: Contact & Location -->
          <div class="col-md-5">
            <div class="bg-body p-4 rounded shadow-sm border">

              <!-- Address -->
              <div class="mb-4">
                <h6 class="text-muted mb-2">Location</h6>
                <p class="mb-2 fw-medium">{{ resource.address }}</p>
                <BButton
                  variant="outline-primary"
                  size="sm"
                  class="w-100"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`"
                  target="_blank"
                >
                  Open in Google Maps
                </BButton>
              </div>

              <!-- Phone -->
              <div class="mb-3" v-if="resource.phone">
                <h6 class="text-muted mb-1">Phone</h6>
                <a :href="`tel:${resource.phone}`" class="text-decoration-none fw-medium text-dark">
                  {{ resource.phone }}
                </a>
              </div>

              <!-- Website -->
              <div class="mb-0" v-if="resource.website">
                <h6 class="text-muted mb-1">Website</h6>
                <a :href="resource.website" target="_blank" class="text-decoration-none text-truncate d-block">
                  {{ resource.website }}
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>

      <BButton v-if="isLoggedIn" variant="primary" class="mt-3" @click="clickEditResource(resource.id)">
        Edit Resource
      </BButton>

      <hr class="my-5" />

      <h3 class="mb-4">Reviews</h3>

      <BCard v-if="isLoggedIn" class="mb-5">
        <BForm @submit.prevent="submitReview" v-if="!alreadyHasReview">
          <h5 class="mb-3">Leave a Review</h5>
          <BAlert :model-value="!!formError" @update:model-value="formError = ''" variant="danger" dismissible>
            {{ formError }}
          </BAlert>
          <BRow>
            <BCol md="4">
              <BFormGroup label="Rating" label-for="rating-select" class="mb-3">
                <BFormSelect id="rating-select" v-model="reviewForm.rating" :options="ratingOptions" required />
              </BFormGroup>
            </BCol>
          </BRow>
          <BFormGroup label="Your Experience" label-for="review-content" class="mb-3">
            <BFormTextarea id="review-content" v-model="reviewForm.content" rows="3" placeholder="Share your thoughts to help others..." />
          </BFormGroup>
          <BButton type="submit" variant="primary" :disabled="isSubmitting">
            <BSpinner v-if="isSubmitting" small class="me-2" />
            {{ isSubmitting ? 'Posting...' : 'Post Review' }}
          </BButton>
        </BForm>
        <span class="text-muted" v-else>you already have a reivew, edit it</span>
      </BCard>

      <BAlert v-else variant="info" class="mb-5" show>
        You must <NuxtLink to="/login" class="alert-link">log in</NuxtLink> to leave a review.
      </BAlert>

      <div v-if="resource.reviews && resource.reviews.length">
        <BCard v-for="review in resource.reviews" :key="review.id" class="mb-3">

          <div v-if="editingReviewId !== review.id">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong>User #{{ review.user_id }}</strong>
              <div>
                <BBadge variant="warning" class="text-dark me-2">⭐ {{ review.rating }} / 5</BBadge>
                <BButton
                  v-if="user && String(user.id) === String(review.user_id)"
                  size="sm"
                  variant="outline-secondary"
                  @click="startEditing(review)"
                >
                  Edit
                </BButton>
              </div>
            </div>
            <p class="mb-0 text-muted">{{ review.content }}</p>
          </div>

          <div v-else>
            <BForm @submit.prevent="submitEdit(review.id)">
              <div class="d-flex justify-content-between mb-3">
                <strong>Editing Review</strong>
                <BButton size="sm" variant="link" class="text-muted" @click="cancelEditing">Cancel</BButton>
              </div>

              <BRow>
                <BCol md="4">
                  <BFormSelect v-model="editForm.rating" :options="ratingOptions" class="mb-3" required />
                </BCol>
              </BRow>

              <BFormTextarea v-model="editForm.content" rows="3" class="mb-3" required />

              <BButton type="submit" variant="success" size="sm" :disabled="isEditing">
                {{ isEditing ? 'Saving...' : 'Save Changes' }}
              </BButton>
            </BForm>
          </div>

        </BCard>
      </div>
      <p v-else class="text-muted">No reviews yet. Be the first to share your experience!</p>

    </div>

    <div v-else>
      <BAlert variant="danger" show>Resource not found.</BAlert>
    </div>
  </BContainer>
</template>

<script setup>
import { ref } from 'vue';

const route = useRoute();
const { isLoggedIn, user } = useAuth();

const { data: response, pending: loading, refresh: refreshResource } = await useFetch(`/api/resources/${route.params.id}`);
const resource = computed(() => response.value?.data || response.value);

const mapContainer = ref(null);
let L = null;
onMounted(async () => {
  refreshMap();
});

async function refreshMap() {
  // Only initialize map if we have coordinates
  if (resource.value?.latitude && resource.value?.longitude) {
    L = (await import('leaflet')).default;

    // Create the map
    const map = L.map('resource-map', {scrollWheelZoom: false,}).setView([resource.value.latitude, resource.value.longitude], 15);

    L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const customMarker = L.divIcon({
      className: 'custom-pin',
      html: `<div class="pin-dot"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    const marker = L.marker([resource.value.latitude, resource.value.longitude], { icon: customMarker })
    marker.addTo(map)
  }
}

async function clickEditResource(id) {
  if (isLoggedIn.value) {
    navigateTo('/resource/edit/' + id);
  } else {
    navigateTo('/login?warn=required');
  }
}

const ratingOptions = [
  { value: 5, text: '5 - Excellent' },
  { value: 4, text: '4 - Good' },
  { value: 3, text: '3 - Average' },
  { value: 2, text: '2 - Poor' },
  { value: 1, text: '1 - Terrible' }
];

// --- NEW REVIEW LOGIC ---
const isSubmitting = ref(false);
const formError = ref('');
const reviewForm = ref({ rating: 5, content: '' });

const submitReview = async () => {
  isSubmitting.value = true;
  formError.value = '';
  try {
    await $fetch(`/api/reviews/${route.params.id}`, {
      method: 'POST',
      body: reviewForm.value
    });
    reviewForm.value = { rating: 5, content: '' };
    await refreshResource();
  } catch (error) {
    formError.value = error.data?.statusMessage || 'Something went wrong while posting your review.';
  } finally {
    isSubmitting.value = false;
  }
};

// --- EDIT REVIEW LOGIC ---
const alreadyHasReview = computed(() => {
  // 1. If they aren't logged in, or there are no reviews yet, return false safely
  if (!user.value || !resource.value?.reviews) {
    return false;
  }

  // 2. Use .some() to check if their ID exists in the reviews array
  return resource.value.reviews.some(
    (review) => String(review.user_id) === String(user.value.id)
  );
});
const editingReviewId = ref(null);
const isEditing = ref(false);
const editForm = ref({ rating: 5, content: '' });

const startEditing = (review) => {
  editingReviewId.value = review.id;
  // Pre-fill the form with the existing review data
  editForm.value = { rating: review.rating, content: review.content };
};

const cancelEditing = () => {
  editingReviewId.value = null;
  editForm.value = { rating: 5, content: '' };
};

const submitEdit = async (reviewId) => {
  isEditing.value = true;
  try {
    // Send PUT request to our new endpoint
    await $fetch(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      body: editForm.value
    });

    // Close the edit form and refresh the data
    editingReviewId.value = null;
    await refreshResource();
  } catch (error) {
    alert(error.data?.statusMessage || 'Failed to update review.');
  } finally {
    isEditing.value = false;
  }
};
</script>

<style scoped>
@import 'leaflet/dist/leaflet.css';

.map-render-area {
  width: 100%;
  height: 300px; /* Smaller height for detail pages */
}

:deep(.custom-pin) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.pin-dot) {
  width: 24px;
  height: 24px;
  background-color: #8b5cf6; /* A nice purple color */
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  transition: transform 0.2s;
}

:deep(.pin-dot:hover) {
  transform: scale(1.2);
  background-color: #7c3aed;
}
</style>