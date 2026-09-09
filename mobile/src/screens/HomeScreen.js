import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, setToken } from '../api/client';
import { Button, Card, Pill } from '../components/UI';
import { colors, spacing, font, radius } from '../theme/theme';

const unitLabel = { gram: 'gr altın', ceyrek: 'çeyrek', try: 'TL' };
const statusTone = { forming: 'gold', drawn: 'default', active: 'success', completed: 'success' };
const statusText = { forming: 'Üye topluyor', drawn: 'Sıra belirlendi', active: 'Aktif', completed: 'Tamamlandı' };

export default function HomeScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.listGroups(); setGroups(res.groups); }
    catch (e) { /* sessiz */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function logout() {
    await setToken(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.actions}>
          <Button title="+ Yeni Grup" onPress={() => navigation.navigate('CreateGroup')} style={{ flex: 1 }} />
        </View>
        <View style={{ width: spacing.sm }} />
        <Button title="Katıl" variant="ghost" onPress={() => navigation.navigate('Join', {})} style={{ paddingHorizontal: 20 }} />
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Text style={{ fontSize: 44 }}>🪙</Text>
            <Text style={[font.dim, { marginTop: spacing.sm }]}>Henüz bir grubun yok. Yeni bir tane kur!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('GroupDetail', { id: item.id })}>
            <Card>
              <View style={styles.cardHead}>
                <Text style={font.h2}>{item.name}</Text>
                <Pill text={statusText[item.status] || item.status} tone={statusTone[item.status] || 'default'} />
              </View>
              <Text style={[font.dim, { marginTop: 6 }]}>
                {item.memberCount} kişi • Kişi başı {item.amount} {unitLabel[item.unit] || item.unit} / ay
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity onPress={logout} style={styles.logout}>
        <Text style={{ color: colors.textDim }}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', padding: spacing.lg, paddingBottom: 0 },
  actions: { flex: 1 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logout: { alignItems: 'center', padding: spacing.md },
});
