import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

import { colors } from './src/theme/theme';
import { loadToken } from './src/api/client';

import LoginScreen from './src/screens/LoginScreen';
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

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialToken, setInitialToken] = useState(null);

  useEffect(() => { loadToken().then((t) => { setInitialToken(t); setReady(true); }); }, []);
  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme} linking={linking}>
        <Stack.Navigator
          initialRouteName={initialToken ? 'Main' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
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
