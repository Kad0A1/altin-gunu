import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

import { colors } from './src/theme/theme';
import { loadToken, setToken, api } from './src/api/client';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OtpScreen from './src/screens/OtpScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import GoldRateScreen from './src/screens/GoldRateScreen';
import ScanScreen from './src/screens/ScanScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: [Linking.createURL('/'), 'https://altingunu.app', 'altingunu://'],
  config: { screens: { Join: 'join/:code' } },
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.gold },
};

function ScanTabButton({ children, onPress }) {
  return (
    <TouchableOpacity style={styles.fabWrap} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.fab}>{children}</View>
    </TouchableOpacity>
  );
}

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={{ alignItems: 'center', width: 70 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
      <Text style={{ fontSize: 11, marginTop: 2, color: focused ? colors.gold : colors.textDim }}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: styles.tabBar }}>
      <Tab.Screen name="Groups" component={GroupsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Gruplarım" focused={focused} /> }} />
      <Tab.Screen name="Scan" component={ScanScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 26 }}>📷</Text>,
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }} />
      <Tab.Screen name="GoldRate" component={GoldRateScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🪙" label="Altın Kuru" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// Basit yükleme ekranı
function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🪙</Text>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      if (!t) { setSignedIn(false); setReady(true); return; }
      // Token VAR — ama gerçekten geçerli mi? Backend'e sorup doğrula.
      try {
        await api.me();          // 200 dönerse token geçerli
        setSignedIn(true);
      } catch (e) {
        // 401 / geçersiz / kullanıcı silinmiş → token'ı temizle, girişe yönlendir
        await setToken(null);
        setSignedIn(false);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <Splash />;

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme} linking={linking}>
        <Stack.Navigator
          initialRouteName={signedIn ? 'Main' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Kayıt Ol' }} />
          <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Doğrulama' }} />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profilim' }} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Yeni Grup' }} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Grup' }} />
          <Stack.Screen name="Join" component={JoinGroupScreen} options={{ title: 'Gruba Katıl' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, height: 70, paddingBottom: 10, paddingTop: 8 },
  fabWrap: { top: -22, justifyContent: 'center', alignItems: 'center' },
  fab: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: colors.gold,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
});
