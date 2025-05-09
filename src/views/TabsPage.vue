<template>
  <ion-page>
    <ion-tabs>
  <ion-router-outlet cache="false"></ion-router-outlet>
  <ion-tab-bar slot="bottom" id="mainTabBar">
    <ion-tab-button tab="home" href="/tabs/home">
      <ion-icon name="home-regular"/>
      <ion-label>Home</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="locations" href="/tabs/locations">
      <ion-icon name="locations-regular" />
      <ion-label>Locations</ion-label>
    </ion-tab-button>
    <ion-tab-button v-if="(hasAppCardCoupons || hasMidaxCoupons) && (!hasMidaxCoupons || hasStoreId) && hasCoupons" tab="coupons" href="/tabs/coupons">
      <ion-icon name="barcode-coupon-regular" />
      <ion-label>Coupons</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="recipes" href="/tabs/recipes">
      <ion-icon name="recipes-regular" />
      <ion-label>Recipes</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="preferences" href="/tabs/preferences">
      <ion-icon name="more-regular" />
      <ion-label>More</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
  </ion-page>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue';
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { useCouponDetails } from '@/composables/useCouponDetails';
import { TokenStorage } from '@/utils/tokenStorage';

export default {
  components: {
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonLabel,
    IonIcon,
    IonPage,
    IonRouterOutlet
  },
  setup() {
    const { coupons, loading, fetchCoupons } = useCouponDetails();
    const hasAppCardCoupons = ref(import.meta.env.VITE_HAS_APPCARD_COUPONS === "true");
    const hasMidaxCoupons = ref(import.meta.env.VITE_HAS_MIDAX_COUPONS === "true");
    const hasStoreId = computed(() => !!localStorage.getItem('storeId'));

    // Dynamic coupon availability
    const hasCoupons = computed(() => coupons.value.length > 0);

    // Watch for location changes
    watch(() => localStorage.getItem('selectedLocation'), async (newLocation) => {
      if (newLocation) {
        await fetchCoupons({ limit: 10, offset: 0 });
      }
    });

    // Watch for authentication changes
    watch(() => TokenStorage.hasTokens(), async (isAuthenticated) => {
      if (isAuthenticated) {
        await fetchCoupons({ limit: 10, offset: 0 });
      }
    });

    onMounted(async () => {
      // Initial coupon fetch
      if (hasMidaxCoupons.value) {
        const selectedLocation = localStorage.getItem('selectedLocation');
        if (selectedLocation) {
          await fetchCoupons({ limit: 10, offset: 0 });
        }
      } else {
        // For AppCard, fetch immediately
        await fetchCoupons({ limit: 10, offset: 0 });
      }

      // Listen for location change events
      window.addEventListener('locationChanged', async () => {
        await fetchCoupons({ limit: 10, offset: 0 });
      });
    });

    return {
      hasAppCardCoupons,
      hasMidaxCoupons,
      hasStoreId,
      hasCoupons
    };
  }
};
</script>

<style lang="css" scoped>
ion-tab-button ion-icon {
  padding: 4px; /* Adjust as needed */
}
</style>