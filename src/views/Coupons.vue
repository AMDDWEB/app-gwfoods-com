<template>
  <ion-page>
    <ion-header>
      <!-- All/Clipped Toggle First -->
      <ion-toolbar>
        <ion-segment class="coupon-toggle" v-model="selectedView" style="width: 90%;">
          <ion-segment-button value="all">
            <ion-label>All Coupons</ion-label>
          </ion-segment-button>
          <ion-segment-button value="clipped">
            <ion-label>Clipped</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Category Menu Second -->
      <ion-toolbar>
        <ion-segment
          mode="ios"
          scrollable
          class="ion-padding-start coupon-categories coupon-categories-ion-segment"
          :value="selectedCategory"
        >
          <ion-segment-button class="coupon-categories-ion-segment-button"
            v-for="category in sortedCategories"
            :key="category"
            :value="category"
            @click="setCategory(category)"
          >
            {{ category }}
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Search Bar Third -->
      <ion-toolbar>
        <div class="app-search-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="app-custom-search-icon">
            <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM288 176c0-44.2-35.8-80-80-80s-80 35.8-80 80c0 48.8 46.5 111.6 68.6 138.6c6 7.3 16.8 7.3 22.7 0c22.1-27 68.6-89.8 68.6-138.6zm-112 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
          </svg>
          <input
            v-model="searchQuery"
            placeholder="Search coupons..."
            @input="handleSearch"
            class="app-search-input"
          />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="coupon-grid">
        <div v-if="loading" class="loading-container">
          <ion-spinner name="crescent" class="app-loading-spinner"></ion-spinner>
        </div>
        
        <div v-else-if="displayedCoupons.length === 0" class="no-coupons">
          <h3>{{ selectedView === 'clipped' ? 'No Clipped Coupons' : searchQuery.value ? 'No Matching Coupons' : 'No Coupons Available' }}</h3>
          <p>{{ selectedView === 'clipped' ? 'Clip some coupons to see them here!' : searchQuery.value ? 'Try a different search term.' : 'Check back later for new deals.' }}</p>
        </div>

        <div v-else class="coupon-container">
          <CouponCard
            v-for="coupon in displayedCoupons"
            :key="coupon.id"
            :coupon="coupon"
            @click="goToCouponDetails(coupon.id)"
          />
        </div>
      </div>

      <!-- Informative Messages -->
      <div v-if="searchQuery && !loading && displayedCoupons.length > 0" class="search-info">
        {{ displayedCoupons.length }} coupons match your search.
      </div>
    </ion-content>

    <SignupModal />
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCouponDetails } from '@/composables/useCouponDetails';
import { useSignupModal } from '@/composables/useSignupModal';
import { useClippedCoupons } from '@/composables/useClippedCoupons';
import { useRouter } from 'vue-router';
import CouponCard from '@/components/CouponCard.vue';
import { IonPage, IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton, 
         IonLabel, IonSpinner } from '@ionic/vue';
import { defineComponent } from 'vue';

const router = useRouter();
const { coupons, loading, fetchCoupons, availableCategories, fetchCategories, isMidax } = useCouponDetails();
const { SignupModal } = useSignupModal();
const { isCouponClipped, syncClippedCoupons, cleanupExpiredCoupons } = useClippedCoupons();

const offset = ref(0);
const limit = ref(isMidax.value ? 20 : 1000);
const selectedView = ref('all');
const selectedCategory = ref('All Coupons');
const searchQuery = ref('');
const searchTimeout = ref(null);
const uniqueCouponIds = ref(new Set());

const sortedCategories = computed(() => {
  const filteredCategories = availableCategories.value
    .filter(category => category !== 'All Coupons')
    .sort((a, b) => a.localeCompare(b));
  return ['All Coupons', ...filteredCategories];
});

// Watch for changes in the coupons array to sync clipped coupons
watch(coupons, (newCoupons) => {
  if (newCoupons && Array.isArray(newCoupons)) {
    syncClippedCoupons(newCoupons);
  }
});

// Watch for changes to selectedView to cleanup expired coupons when viewing clipped
watch(selectedView, async (newView) => {
  if (newView === 'clipped') {
    await cleanupExpiredCoupons();
  }
});

// Watch searchQuery with debouncing
watch(searchQuery, (newQuery) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(() => {
    // Since all coupons are loaded upfront, we don't need to fetch again
    // The displayedCoupons computed property will handle filtering
  }, 300);
});

const displayedCoupons = computed(() => {
  let filtered = [...coupons.value]; // Create a shallow copy to avoid mutating the original array

  // Filter by category if not "All Coupons"
  if (selectedCategory.value !== 'All Coupons') {
    filtered = filtered.filter(coupon => coupon.category === selectedCategory.value);
  }

  // Filter by clipped status
  if (selectedView.value === 'clipped') {
    filtered = filtered.filter(coupon => isCouponClipped(coupon.id));
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(coupon =>
      coupon.title?.toLowerCase().includes(query) ||
      coupon.description?.toLowerCase().includes(query) ||
      coupon.category?.toLowerCase().includes(query) ||
      coupon.disclaimer?.toLowerCase().includes(query) ||
      coupon.to_date?.toLowerCase().includes(query)
    );
  }

  // Ensure unique coupons by ID
  const uniqueCoupons = new Map();
  filtered.forEach(coupon => {
    if (!uniqueCoupons.has(coupon.id)) {
      uniqueCoupons.set(coupon.id, coupon);
    }
  });

  return Array.from(uniqueCoupons.values());
});

// Function to load all coupons
const loadAllCoupons = async () => {
  loading.value = true;
  offset.value = 0;
  coupons.value = [];
  uniqueCouponIds.value.clear();

  const maxCoupons = 5000; // Safety limit to prevent infinite loops
  let totalLoaded = 0;

  try {
    while (totalLoaded < maxCoupons) {
      const response = await fetchCoupons({ limit: limit.value, offset: offset.value });
      const items = response?.items || response?.data?.items || [];

      if (items.length === 0) {
        break; // No more coupons to load
      }

      // Filter out duplicates
      const newCoupons = items.filter(coupon => !uniqueCouponIds.value.has(coupon.id));
      newCoupons.forEach(coupon => uniqueCouponIds.value.add(coupon.id));
      coupons.value = [...coupons.value, ...newCoupons];

      totalLoaded += newCoupons.length;
      offset.value += limit.value;

      // Optional: Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error loading all coupons:', error);
  } finally {
    loading.value = false;
  }
};

const setCategory = async (category) => {
  selectedCategory.value = category;
  await loadAllCoupons(); // Reload all coupons with the new category
};

const goToCouponDetails = (couponId) => {
  router.push(`/coupons/${couponId}`);
};

const handleSearch = () => {
  // Debouncing is handled by the watch function
};

onMounted(async () => {
  await fetchCategories();
  await loadAllCoupons();
  window.addEventListener('userSignedUp', () => {
    loadAllCoupons();
  });
});

onUnmounted(() => {
  window.removeEventListener('userSignedUp', () => loadAllCoupons());
});

defineComponent({ name: 'CouponsPage' });
</script>

<style scoped>
.coupon-grid {
  padding-top: 20px;
  padding-left: 10px;
  padding-right: 10px;
}

.coupon-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  row-gap: 14px;
  column-gap: 6px;
}

.coupon-categories-ion-segment {
  --background: var(--ion-color-light);
}
.coupon-categories-ion-segment-button::before {
  content: none;
}
.coupon-categories-ion-segment-button {
  border: none;
  text-transform: capitalize;
  margin-bottom: 8px;
}
.coupon-categories-ion-segment-button.segment-button-checked {
  background: var(--ion-color-primary) !important;
  color: #fff;
}
.coupon-categories-ion-segment-button::part(indicator-background) {
  height: 0px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.no-coupons {
  text-align: center;
  padding: 32px;
  color: var(--ion-color-medium);
}

.search-info {
  text-align: center;
  padding: 10px;
  color: var(--ion-color-medium);
}

@media (min-width: 768px) {
  .coupon-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .coupon-container {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>