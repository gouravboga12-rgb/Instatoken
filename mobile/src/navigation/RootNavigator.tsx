import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import { RoleChooserScreen } from '../screens/RoleChooserScreen';
import { WebContainerScreen } from '../screens/WebContainerScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const navigateToUrl = (targetUrl: string) => {
      if (!targetUrl) return;
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

    // 1. Deep linking handler (browser URL / instatoken:// scheme)
    const handleUrl = (url: string | null) => {
      if (!url) return;
      navigateToUrl(url);
    };

    Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener('url', (event) => handleUrl(event.url));

    // 2. Notification response handler (when app is in background or foreground)
    const notificationSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        const target = data.url || data.deepLink || (data.tokenId ? `https://instatoken.in/confirmation/${data.tokenId}` : null);
        if (target) {
          navigateToUrl(target);
        }
      }
    });

    // 3. Cold start handler (when app was killed and opened by tapping notification)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          const target = data.url || data.deepLink || (data.tokenId ? `https://instatoken.in/confirmation/${data.tokenId}` : null);
          if (target) {
            setTimeout(() => {
              navigateToUrl(target);
            }, 500);
          }
        }
      }
    });

    return () => {
      linkSub.remove();
      notificationSub.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="RoleChooser"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="RoleChooser" component={RoleChooserScreen} />
        <Stack.Screen name="WebContainer" component={WebContainerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
