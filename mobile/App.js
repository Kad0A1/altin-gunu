import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

import { colors } from './src/theme/theme';
import { loadToken } from './src/api/client';

import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';

const Stack = createNativeStackNavigator();

// Deep link: altingunu://join/GX7K2Q  ve  https://altingunu.app/join/GX7K2Q
const linking = {
  prefixes: [Linking.createURL('/'), 'https://altingunu.app', 'altingunu://'],
  config: { screens: { Join: 'join/:code' } },
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.gold },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialToken, setInitialToken] = useState(null);

  useEffect(() => {
    loadToken().then((t) => { setInitialToken(t); setReady(true); });
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme} linking={linking}>
        <Stack.Navigator
          initialRouteName={initialToken ? 'Home' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Doğrulama' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Altın Günü' }} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Yeni Grup' }} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Grup' }} />
          <Stack.Screen name="Join" component={JoinGroupScreen} options={{ title: 'Gruba Katıl' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
