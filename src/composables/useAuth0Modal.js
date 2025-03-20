import { useAuth0 } from '@auth0/auth0-vue'
import { callbackUri } from '../main'
import { Browser } from '@capacitor/browser'
import { useRouter } from 'vue-router'

export const useAuthModule = () => {
  const router = useRouter()

  const {
    getAccessTokenSilently,
    handleRedirectCallback,
    isAuthenticated,
    loginWithRedirect,
    logout,
    user
  } = useAuth0()

  const signIn = async () => {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    const cardNumber = localStorage.getItem('cardNumber');
    const storeId = localStorage.getItem('storeId');
    
    if (accessToken && (cardNumber || storeId) && isAuthenticated.value) {
      console.log('Already authenticated, skipping login redirect');
      return;
    }
    
    await loginWithRedirect({
      openUrl: url =>
        Browser.open({
          url,
          presentationStyle: 'popover',
          windowName: '_self'
        })
    })
  }

  const signOut = async () => {
    // Clear all auth-related localStorage items
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('cardNumber');
    localStorage.removeItem('firstName');
    
    await logout({
      logoutParams: {
        returnTo: callbackUri
      },
      openUrl: url =>
        Browser.open({
          url,
          windowName: '_self'
        })
    })
    router.go(-1)
  }

  return {
    handleRedirectCallback,
    isAuthenticated,
    getAccessTokenSilently,
    signIn,
    signOut,
    user
  }
}
