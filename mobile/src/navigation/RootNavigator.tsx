import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RoleChooserScreen } from '../screens/RoleChooserScreen';
import { WebContainerScreen } from '../screens/WebContainerScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef();
  const [initialRoute, setInitialRoute] = useState<{ name: string; params?: any } | null>(null);

  useEffect(() => {
    let hasHandledNotificationOrDeepLink = false;

    const navigateToUrl = (targetUrl: string) => {
      if (!targetUrl) return;
      hasHandledNotificationOrDeepLink = true;
      let fullUrl = targetUrl;
      if (targetUrl.startsWith('instatoken://')) {
        const path = targetUrl.replace('instatoken://', '').replace(/^\/+/, '');
        fullUrl = `https://instatoken.in/${path}`;
      } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        fullUrl = `https://instatoken.in/${targetUrl.replace(/^\/+/, '')}`;
      }

      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('WebContainer', {
          initialUrl: fullUrl,
          role: 'patient',
          title: 'Patient Portal',
          timestamp: Date.now(),
        });
      }
    };

    // 1. Check cold start notification tap first
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          const target = data.url || data.deepLink || (data.tokenId ? `https://instatoken.in/confirmation/${data.tokenId}` : null);
          if (target) {
            hasHandledNotificationOrDeepLink = true;
            setInitialRoute({
              name: 'WebContainer',
              params: {
                initialUrl: target,
                role: 'patient',
                title: 'Patient Portal',
                timestamp: Date.now(),
              },
            });
            return;
          }
        }
      }

      // 2. Check cold start deep link
      Linking.getInitialURL().then((url) => {
        if (url) {
          hasHandledNotificationOrDeepLink = true;
          let fullUrl = url;
          if (url.startsWith('instatoken://')) {
            const path = url.replace('instatoken://', '').replace(/^\/+/, '');
            fullUrl = `https://instatoken.in/${path}`;
          }
          setInitialRoute({
            name: 'WebContainer',
            params: {
              initialUrl: fullUrl,
              role: 'patient',
              title: 'Patient Portal',
              timestamp: Date.now(),
            },
          });
          return;
        }

        // 3. Check saved active session for hospital or patient login persistence
        AsyncStorage.getItem('saved_active_role').then((savedRole) => {
          if (!hasHandledNotificationOrDeepLink) {
            if (savedRole === 'hospital') {
              setInitialRoute({
                name: 'WebContainer',
                params: {
                  initialUrl: 'https://instatoken.in/hospital/dashboard',
                  role: 'hospital',
                  title: 'Hospital Portal',
                },
              });
            } else if (savedRole === 'patient') {
              setInitialRoute({
                name: 'WebContainer',
                params: {
                  initialUrl: 'https://instatoken.in/',
                  role: 'patient',
                  title: 'Patient Portal',
                },
              });
            } else {
              setInitialRoute({ name: 'RoleChooser' });
            }
          }
        }).catch(() => {
          setInitialRoute({ name: 'RoleChooser' });
        });
      });
    });

    const linkSub = Linking.addEventListener('url', (event) => {
      if (event.url) navigateToUrl(event.url);
    });

    const notificationSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        const target = data.url || data.deepLink || (data.tokenId ? `https://instatoken.in/confirmation/${data.tokenId}` : null);
        if (target) {
          navigateToUrl(target);
        }
      }
    });

    return () => {
      linkSub.remove();
      notificationSub.remove();
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0038BF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute.name}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="RoleChooser" component={RoleChooserScreen} />
        <Stack.Screen
          name="WebContainer"
          component={WebContainerScreen}
          initialParams={initialRoute.name === 'WebContainer' ? initialRoute.params : undefined}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
