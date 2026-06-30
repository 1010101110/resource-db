<template>
  <div class="home-container">
    <header class="hero">
      <p>Find the resources you need, contribute to the database, and support the community.</p>

      <form class="location-search" @submit.prevent="searchLocation">
        <BButton
          type="button"
          @click="locateUser"
          title="Use my current location"
        >📍</BButton>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Enter ZIP code, city, or address..."
          :disabled="searching"
        />
        <BButton type="submit" title="search" :disabled="searching || !searchQuery.trim()">
          {{ searching ? 'Searching...' : 'Search Area' }}
        </BButton>
      </form>
    </header>

<div class="map-wrapper position-relative">

    <div v-if="loading" class="loading-overlay">
      <span>Locating you and loading resources...</span>
    </div>

    <div
      v-if="isFetchingMap"
      class="position-absolute top-0 start-50 translate-middle-y mt-3 badge bg-primary shadow"
      style="z-index: 1002; pointer-events: none;"
    >
      Updating map...
    </div>

    <!-- Zoom / Too Many Pins Warning -->
    <div
      v-if="showZoomWarning && !loading"
      class="position-absolute top-50 start-50 translate-middle bg-dark text-white px-4 py-2 rounded-pill shadow text-center"
      style="z-index: 1002; pointer-events: none; opacity: 0.9;"
    >
      <span class="fw-bold">{{ filteredResources.length }} resources found</span><br>
      <small>Zoom in to view pins</small>
    </div>

    <!-- Filter Control Overlay -->
    <div class="map-filter-overlay position-absolute top-0 end-0 m-3 p-2 bg-body rounded shadow-sm">

      <label for="categoryFilter" class="form-label small fw-bold mb-1">Filter Resources</label>
      <select
        id="categoryFilter"
        v-model="selectedCategory"
        class="form-select form-select-sm"
        @change="applyFilter"
      >
        <option
          v-for="option in categoryOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.text }}
        </option>
      </select>
    </div>

    <ClientOnly>
      <div v-if="isLoggedIn" class="map-filter-overlay position-absolute bottom-0 end-0 m-3 p-2 rounded">
        <BButton @click="clickAddResource" class="btn-sm w-100">+ New resource</BButton><br>
      </div>
    </ClientOnly>

    <div ref="mapContainer" class="map-render-area"></div>
  </div>
    <div class="mt-3 d-flex justify-content-center">
      <p>
        Help us build the database
        <br>
        <span class="text-muted">once logged in you can add resources to the map and leave reviews!</span>
      </p>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()
const { isLoggedIn } = useAuth()

const resources = ref([])
const loading = ref(true)
const isFetchingMap = ref(false)
const searchQuery = ref('')
const searching = ref(false)

const mapContainer = ref(null)

let mapInstance = null
let markerGroup = null
let L = null

const showZoomWarning = ref(false)
const MAX_VISIBLE_PINS = 100
const MIN_ZOOM_LEVEL = 8

const selectedCategory = ref('');

const categoryOptions = [
  { value: '', text: 'View All' },
  { value: 'Healthcare', text: 'HRT / Primary Care' },
  { value: 'Surgeon', text: 'Surgeon' },
  { value: 'Mental Health', text: 'Mental Health / Therapy' },
  { value: 'Hair Removal', text: 'Hair removal' },
  { value: 'Stylist', text: 'Stylist, Beautician' },
  { value: 'Support Group', text: 'Support Group' },
  { value: 'Legal Aid', text: 'Legal Aid / Name Change' },
  { value: 'Housing', text: 'Housing' },
  { value: 'Activity', text: 'Activity / Bar / Gathering' },
  { value: 'Org', text: 'Community / Organization' },
  { value: 'Vendor', text: 'Vendor / Service' },
];

const filteredResources = computed(() => {
  return selectedCategory.value
    ? resources.value.filter(r => r.category === selectedCategory.value)
    : resources.value;
});

const applyFilter = () => {
  renderMarkers();
};

onMounted(async () => {
  L = (await import('leaflet')).default

  await initMap()
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
    markerGroup = null
  }
})

async function fetchResourcesInView() {
  if (!mapInstance) return;

  isFetchingMap.value = true;
  const bounds = mapInstance.getBounds();

  // Construct query parameters for the bounding box
  const params = new URLSearchParams({
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLng: bounds.getWest(),
    maxLng: bounds.getEast()
  });

  try {
    const res = await $fetch(`/api/resources?${params.toString()}`);
    if (res.success) {
      console.log(`Found ${res.data.length} resources in this area.`);
      resources.value = res.data;
      renderMarkers();
    }
  } catch (error) {
    console.error('Failed to fetch resources for current view:', error);
  } finally {
    isFetchingMap.value = false;
  }
}

function renderMarkers() {
  if (!markerGroup || !L) return;

  markerGroup.clearLayers();
  showZoomWarning.value = false;

  const currentZoom = mapInstance.getZoom();

  // Trigger the warning if zoomed out too far OR too many pins
  // (Only trigger if there is actually data to show)
  if (filteredResources.value.length > 0 && (filteredResources.value.length > MAX_VISIBLE_PINS || currentZoom < MIN_ZOOM_LEVEL)) {
    showZoomWarning.value = true;
    return;
  }

  const customMarker = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-dot"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  filteredResources.value.forEach((resource) => {
    const marker = L.marker([resource.latitude, resource.longitude], { icon: customMarker })

    marker.bindTooltip(resource.name, {
      permanent: true,
      direction: 'right',
      interactive: true,
      offset: [10, 0],
      className: 'bg-body border rounded shadow-sm fw-semibold text-body px-2 py-1 text-nowrap'
    });

    marker.bindPopup(`
      <strong>${resource.name}</strong><br>
      <span style="color: #666; font-size: 0.9em;">${resource.category}</span><br>
      <span>${resource.average_rating > 0 ? resource.average_rating + '⭐' : 'no reviews'}</span><br>
      <a href="/resource/${resource.id}" style="font-weight: bold; color: #8b5cf6;">View Details</a>
    `)

    marker.addTo(markerGroup);
  })
}

async function initMap() {
  if (!mapContainer.value) return

  const { lat, lng, zoom } = await initLocation()

  mapInstance = L.map(mapContainer.value).setView([lat, lng], zoom)

  L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance);

  loading.value = false;

  // Hook up the movement listener to fetch new data
  mapInstance.on('moveend zoomend', () => {
    const center = mapInstance.getCenter()
    const currentZoom = mapInstance.getZoom()

    sessionStorage.setItem('mapView', JSON.stringify({
      lat: center.lat,
      lng: center.lng,
      zoom: currentZoom
    }))

    // Fetch resources for the new visible area
    fetchResourcesInView()
  })

  // Do the initial fetch based on wherever the map booted up
  await fetchResourcesInView()
}

async function initLocation() {
  if (route.query.search) {
    searchQuery.value = route.query.search
    const searchResult = await searchLocation()
    if (searchResult) return searchResult
  }

  const savedView = sessionStorage.getItem('mapView')
  if (savedView) {
    try {
      return JSON.parse(savedView)
    } catch (e) {
      console.warn('Failed to parse stored location')
    }
  }

  // Fallback to default location (Center of US) if no search or session exists
  return { lat: 39.8283, lng: -98.5795, zoom: 4 }
}

async function locateUser() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.")
    return
  }

  // Turn on the loading overlay while waiting for the user to accept the prompt
  loading.value = true

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      if (mapInstance) {
        // flyTo gives a nice smooth panning animation to the new location
        mapInstance.flyTo([lat, lng], 11, {
          duration: 1.5 // seconds
        })
      }
      loading.value = false
    },
    (error) => {
      console.warn('Geolocation failed:', error)
      alert("Could not get your location. Please check your browser permissions.")
      loading.value = false
    },
    { timeout: 10000 } // Give them 10 seconds to click "Allow"
  )
}

async function searchLocation() {
  if (!searchQuery.value.trim()) return null

  // <-- 2. Sync the UI search with the URL query string
  // We check to ensure we aren't pushing the exact same query, which prevents history bloat
  if (route.query.search !== searchQuery.value) {
    router.push({ query: { ...route.query, search: searchQuery.value } })
  }

  searching.value = true
  let retLocation = null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery.value)}`
    )
    const data = await response.json()

    if (data && data.length > 0) {
      retLocation = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        zoom: 11
      }

      if (mapInstance) {
        mapInstance.setView([retLocation.lat, retLocation.lng], retLocation.zoom)
      }
    } else {
      alert("Location not found. Try adding a state or country if it's ambiguous.")
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    alert("There was an error searching for that location.")
  } finally {
    searching.value = false
  }

  return retLocation
}

watch(
  () => route.query.search,
  (newSearchQuery) => {
    // The watcher already has a guard to prevent an infinite loop
    // when the URL is updated programmatically by searchLocation()
    if (newSearchQuery && newSearchQuery !== searchQuery.value) {
      searchQuery.value = newSearchQuery
      searchLocation()
    }
  }
)

async function clickAddResource() {
  if (isLoggedIn) {
    navigateTo('/resource/add')
  } else {
    navigateTo('/login?warn=required')
  }
}
</script>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 0;
  padding: 1rem 0;
}

/* map css */
.map-wrapper {
  position: relative;
  width: 100%;
  /* height: 500px; */
  height: calc(100vh - 200px);
  min-height: 500px;
}

.map-render-area {
  width: 100%;
  height: 100%;
}

.map-filter-overlay {
  z-index: 1000;
  max-width: 250px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

/* Custom Map Marker CSS */
:deep(.custom-pin) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.pin-dot) {
  width: 16px;
  height: 16px;
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

/* Hides the default Leaflet tooltip arrow */
:deep(.leaflet-tooltip-left::before),
:deep(.leaflet-tooltip-right::before) {
  display: none !important;
}

/* Optional: Removes the default black border Leaflet applies to tooltips,
   allowing your Bootstrap 'border' class to take over smoothly */
:deep(.leaflet-tooltip) {
  border: none;
  margin: 0 !important;
}

.location-search {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  max-width: 500px;
  margin: 1.5rem auto 0;
}

.location-search input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.location-search input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

button {
  padding: 0.75rem 1.5rem;
  background-color: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #7c3aed;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>