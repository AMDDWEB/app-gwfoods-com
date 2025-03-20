<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup>
import { IonApp, IonRouterOutlet, isPlatform } from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { AppTrackingTransparency } from 'capacitor-plugin-app-tracking-transparency'
import { watch } from 'vue'
import CustomerApi from './axios/apiCustomer'
import { useAuthModule } from './composables/useAuth0Modal'
import { useRouter } from 'vue-router'
import Customer from './axios/apiCustomer'

const router = useRouter()

const {
  getAccessTokenSilently,
  handleRedirectCallback,
  isAuthenticated
} = useAuthModule()

async function getAccessToken() {
  return await getAccessTokenSilently()
}

watch(isAuthenticated, async (newValue) => {
  if (newValue) {
    const accessToken = await getAccessToken()
    localStorage.setItem('accessToken', accessToken)
    
    const storeId = localStorage.getItem('storeId')

    try {
      const response = await Customer.checkForExistingUser(storeId)
      const userDetailsArray = response.data
      
      if (Array.isArray(userDetailsArray) && userDetailsArray.length > 0) {
        const userDetails = userDetailsArray[0]
        if (userDetails.cardNumber) {
          localStorage.setItem('cardNumber', userDetails.cardNumber)
        }
        if (userDetails.FirstName) {
          localStorage.setItem('firstName', userDetails.FirstName)
        }
        
        window.dispatchEvent(new CustomEvent('userSignedUp', {
          detail: {
            loyaltyNumber: userDetails.PhoneNumber || '',
            cardNumber: userDetails.cardNumber || ''
          }
        }))
      }
    } catch (error) {
      console.error('Error checking user details:', error)
    }
  }
})

async function checkForExistingUser() {
  const accessToken = await getAccessToken()
  try {
    const response = await CustomerApi.checkForExistingUser(
      accessToken, 
      localStorage.getItem('storeId'),
      import.meta.env.VITE_APP_ID
    )
    if (response.data) {
      localStorage.setItem('userData', JSON.stringify(response.data))
      if (import.meta.env.VITE_HAS_MIDAX_COUPONS === "true") {
        if (response.data.card_number) {
          localStorage.setItem('cardNumber', response.data.card_number)
          
          window.dispatchEvent(new CustomEvent('userSignedUp', {
            detail: {
              loyaltyNumber: response.data.phone_number || '',
              cardNumber: response.data.card_number || ''
            }
          }))
        }
      }
    }
  } catch (error) {
    console.error('Error checking for existing user:', error)
  }
}

// Initialize App Tracking Transparency
async function initAppTracking() {
  try {
    const status = await AppTrackingTransparency.getStatus()
    
    if (status.status === 'notDetermined') {
      await AppTrackingTransparency.requestPermission()
    }
  } catch (error) {
    console.error('Error requesting tracking permission:', error)
  }
}

// Call the initialization function
if (isPlatform('ios')) {
  initAppTracking()
}

CapApp.addListener('appUrlOpen', async ({ url }) => {
  console.log('URL opened:', url)
  if (url.includes('state') && (url.includes('code') || url.includes('error'))) {
    await handleRedirectCallback(url)
  }
  
  await Browser.close()
  
  if (isAuthenticated.value) {
    checkForExistingUser()
  }
})
</script>
