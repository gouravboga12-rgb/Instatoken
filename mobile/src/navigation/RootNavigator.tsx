import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RoleChooserScreen } from '../screens/RoleChooserScreen';
import { WebContainerScreen } from '../screens/WebContainerScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
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
