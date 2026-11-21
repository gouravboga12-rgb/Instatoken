import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { RoleChooserScreen } from '../screens/RoleChooserScreen';
import { WebContainerScreen } from '../screens/WebContainerScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      let targetPath = '';
      if (url.startsWith('instatoken://')) {
        targetPath = url.replace('instatoken://', '');
      } else if (url.includes('instatoken.in/')) {
        targetPath = url.split('instatoken.in/')[1] || '';
      }
      if (targetPath) {
        (navigationRef as any).navigate('WebContainer', {
          initialUrl: `https://instatoken.in/${targetPath.replace(/^\/+/, '')}`,
          role: 'patient',
          title: 'Patient Portal'
        });
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
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
