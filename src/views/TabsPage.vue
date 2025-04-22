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
    <ion-tab-button v-if="hasAppCardCoupons || hasMidaxCoupons" tab="coupons" href="/tabs/coupons">
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
import { ref } from 'vue';
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';

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
    const hasAppCardCoupons = ref(import.meta.env.VITE_HAS_APPCARD_COUPONS === "true");
    const hasMidaxCoupons = ref(import.meta.env.VITE_HAS_MIDAX_COUPONS === "true");

    return {
      hasAppCardCoupons,
      hasMidaxCoupons
    };
  }
};
</script>

<style lang="css" scoped>
ion-tab-button ion-icon {
  padding: 4px; /* Adjust as needed */
}
</style>