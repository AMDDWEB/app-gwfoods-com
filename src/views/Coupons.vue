<template>
  <ion-page>
    <ion-header>
      <!-- All/Clipped Toggle First -->
      <ion-toolbar>
        <ion-segment class="coupon-toggle" v-model="selectedView" style="margin: 0 auto; width: 200px;">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
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
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="coupon-grid">
        <div v-if="loading && !isLoadingMore" class="loading-container">
          <ion-spinner name="crescent" class="app-loading-spinner"></ion-spinner>
        </div>
        
        <div v-else-if="displayedCoupons.length === 0" class="no-coupons">
          <h3>{{ selectedView === 'clipped' ? 'No Clipped Coupons' : 'No Coupons Available' }}</h3>
          <p>{{ selectedView === 'clipped' ? 'Clip some coupons to see them here!' : 'Check back later for new deals.' }}</p>
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

      <ion-infinite-scroll
        v-if="isMidax"
        @ionInfinite="loadMore"
        :disabled="!hasMoreCoupons || selectedView === 'clipped'"
        threshold="100px"
      >
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
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
         IonLabel, IonSpinner, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/vue';
import { defineComponent } from 'vue';

const router = useRouter();
const { coupons, loading, fetchCoupons, availableCategories, fetchCategories, isMidax } = useCouponDetails();
const { SignupModal } = useSignupModal();
const { isCouponClipped, syncClippedCoupons, cleanupExpiredCoupons } = useClippedCoupons();

const offset = ref(0);
const limit = ref(isMidax.value ? 20 : 1000);
const hasMoreCoupons = ref(true);
const selectedView = ref('all');
const selectedCategory = ref('All Coupons');
const isLoadingMore = ref(false);

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

const displayedCoupons = computed(() => {
  let filtered = coupons.value;
  
  // Filter by category if not "All Coupons"
  if (selectedCategory.value !== 'All Coupons') {
    filtered = filtered.filter(coupon => coupon.category === selectedCategory.value);
  }
  
  // Filter by clipped status
  if (selectedView.value === 'clipped') {
    filtered = filtered.filter(coupon => isCouponClipped(coupon.id));
  }
  
  return filtered;
});

const setCategory = async (category) => {
  selectedCategory.value = category;
  offset.value = 0;
  coupons.value = []; // Clear existing coupons
  hasMoreCoupons.value = true;
  await fetchCoupons({ limit: limit.value, offset: 0 });
};

const loadMore = async (event) => {
  if (!isMidax.value || selectedView.value === 'clipped' || !hasMoreCoupons.value || isLoadingMore.value) {
    event.target.complete();
    return;
  }
  
  try {
    isLoadingMore.value = true;
    offset.value += limit.value;
    const previousLength = coupons.value.length;
    
    const response = await fetchCoupons({ limit: limit.value, offset: offset.value });
    
    // Check if we got fewer items than the limit or no new items
    if (!response?.items || response.items.length < limit.value || coupons.value.length === previousLength) {
      hasMoreCoupons.value = false;
    }
  } catch (error) {
    console.error('Error loading more coupons:', error);
    hasMoreCoupons.value = false;
  } finally {
    isLoadingMore.value = false;
    event.target.complete();
  }
};

const goToCouponDetails = (couponId) => {
  router.push(`/coupons/${couponId}`);
};

onMounted(async () => {
  await fetchCategories();
  offset.value = 0;
  coupons.value = []; // Clear existing coupons
  await fetchCoupons({ limit: limit.value, offset: 0 });
  window.addEventListener('userSignedUp', () => {
    offset.value = 0;
    coupons.value = [];
    hasMoreCoupons.value = true;
    fetchCoupons({ limit: limit.value, offset: 0 });
  });
});

onUnmounted(() => {
  window.removeEventListener('userSignedUp', () => fetchCoupons({ limit: limit.value, offset: 0 }));
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
  /* height: 24px; */
  /* border-radius: 20px; */
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