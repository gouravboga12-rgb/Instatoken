import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  Share,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

interface WebContainerScreenProps {
  route: any;
  navigation: any;
}

export const WebContainerScreen: React.FC<WebContainerScreenProps> = ({
  route,
  navigation,
}) => {
  const { initialUrl, role } = route.params;
  const webViewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasVisitedApp, setHasVisitedApp] = useState(false);

  // Navigate WebView when new URL is passed via push notification or deep link
  useEffect(() => {
    if (route.params?.initialUrl && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${route.params.initialUrl}';`);
    }
  }, [route.params?.initialUrl, route.params?.timestamp]);

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    } catch (e) {
      console.warn('GoogleSignin configure error:', e);
    }

    if (Platform.OS === 'android') {
      try {
        PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]).catch(() => {});
      } catch (e) {}
    }

    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      // If at root of WebView history, return to Role Chooser
      navigation.reset({
        index: 0,
        routes: [{ name: 'RoleChooser' }],
      });
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Listen for notification taps to route patient to appointment pass
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && (data.url || data.tokenId)) {
        const targetUrl = data.url || `https://instatoken.in/confirmation/${data.tokenId}`;
        webViewRef.current?.injectJavaScript(`window.location.href = '${targetUrl}';`);
      }
    });

    // Auto-register device push token with backend
    registerPushToken();

    return () => {
      backHandler.remove();
      responseSub.remove();
    };
  }, [canGoBack]);

  const registerPushToken = async (patientPhone?: string, patientTokenId?: string) => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const fcmToken = tokenData?.data;
        if (fcmToken) {
          await axios.post('https://instatoken.in/api/notifications/register-token', {
            fcmToken,
            phone: patientPhone || undefined,
            tokenId: patientTokenId || undefined,
            platform: Platform.OS
          });
        }
      }
    } catch (e) {
      // ignore registration errors
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'LOGOUT') {
        // Return to Role Chooser on logout
        navigation.reset({
          index: 0,
          routes: [{ name: 'RoleChooser' }],
        });
      } else if (data.type === 'GOOGLE_SIGN_IN') {
        await triggerNativeGoogleSignIn();
      } else if (data.type === 'REGISTER_PUSH' || data.type === 'PATIENT_LOGGED_IN') {
        await registerPushToken(data.phone, data.tokenId);
      } else if (data.type === 'SHARE') {
        try {
          await Share.share({
            title: data.title || 'InstaToken Appointment Pass',
            message: data.text ? `${data.text}\n${data.url || ''}` : data.url,
            url: data.url,
          });
        } catch (e) {}
      } else if (data.type === 'OPEN_URL' || data.type === 'DOWNLOAD_PDF') {
        if (data.url) {
          Linking.openURL(data.url).catch(() => {});
        }
      } else if (data.type === 'HAPTIC_CHIME' || data.type === 'TOKEN_CALLED') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (data.payload) {
            const tok = data.payload.tokenNo || '';
            const doc = (data.payload.doctorName || 'Doctor').replace(/^Dr\.?\s*/i, '');
            Speech.speak(`Token ${tok}, Doctor ${doc} is calling.`, {
              language: 'en-IN',
              rate: 0.95,
            });
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // not a json message
    }
  };

  const triggerNativeGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const profile = response.data?.user || (response as any).user;

      if (profile && profile.email) {
        const injectedScript = `
          if (window.__handleNativeGoogleLogin) {
            window.__handleNativeGoogleLogin(${JSON.stringify({
              name: profile.name,
              email: profile.email,
              picture: profile.photo,
              given_name: profile.givenName,
              family_name: profile.familyName,
            })});
          }
        `;
        webViewRef.current?.injectJavaScript(injectedScript);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google Sign in cancelled by user');
      } else {
        Alert.alert('Google Sign-In Error', error.message || 'Could not complete Google Sign-In.');
      }
    }
  };

  const injectedJavaScriptBeforeContentLoaded = `
    window.__IS_INSTATOKEN_NATIVE_APP__ = true;
    window.__NATIVE_ROLE__ = '${role}';
    try {
      const origRemove = localStorage.removeItem.bind(localStorage);
      localStorage.removeItem = function(key) {
        origRemove(key);
        if (key === 'insta_user' || key === 'insta_hospital_user' || key === 'insta_hospital_auth_token') {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'LOGOUT' }));
        }
      };

      const origSet = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function(key, val) {
        origSet(key, val);
        if (key === 'insta_user') {
          try {
            const u = JSON.parse(val);
            if (u && u.phone) {
              window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'REGISTER_PUSH',
                phone: u.phone
              }));
            }
          } catch(e) {}
        }
      };

      setTimeout(function() {
        try {
          const raw = localStorage.getItem('insta_user');
          if (raw) {
            const u = JSON.parse(raw);
            if (u && u.phone) {
              window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'REGISTER_PUSH',
                phone: u.phone
              }));
            }
          }
        } catch(e) {}
      }, 600);
    } catch(e) {}
    true;
  `;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: role === 'hospital' ? '#0F172A' : '#FFFFFF' },
      ]}
    >
      <StatusBar
        barStyle={role === 'hospital' ? 'light-content' : 'dark-content'}
        backgroundColor={role === 'hospital' ? '#0F172A' : '#FFFFFF'}
      />

      {/* Loading Progress Indicator */}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator
            size="small"
            color={role === 'hospital' ? '#38BDF8' : '#0F52BA'}
          />
        </View>
      )}

      {/* 100% Full-Screen Web Panel - Zero Native Overlay */}
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        style={styles.webView}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          const url = navState.url || '';
          const isAuthPage =
            url.includes('/login') ||
            url.includes('/hospital-login') ||
            url.includes('/hospital/login');

          if (!isAuthPage) {
            setHasVisitedApp(true);
          } else if (hasVisitedApp) {
            // User was inside the app and redirected back to login page -> trigger return to RoleChooser
            navigation.reset({
              index: 0,
              routes: [{ name: 'RoleChooser' }],
            });
          }
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        allowsBackForwardNavigationGestures={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (
            url.startsWith('tel:') ||
            url.startsWith('mailto:') ||
            url.startsWith('whatsapp:') ||
            url.startsWith('intent:') ||
            url.includes('api.whatsapp.com')
          ) {
            Linking.openURL(url).catch(() => {});
            return false;
          }
          return true;
        }}
        userAgent="InstaToken-Android-App/1.0"
        pullToRefreshEnabled={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  loader: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 99,
    alignItems: 'center',
  },
  webView: {
    flex: 1,
  },
});
