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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';

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

    return () => backHandler.remove();
  }, [canGoBack]);

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
      } else if (data.type === 'HAPTIC_CHIME' || data.type === 'TOKEN_CALLED') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        userAgent="InstaToken-Android-App/1.0"
        pullToRefreshEnabled={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
