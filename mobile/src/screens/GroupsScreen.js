import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Card, Pill } from '../components/UI';
import { colors, spacing, font, radius } from '../theme/theme';

const unitLabel = { gram: 'gr altın', ceyrek: 'çeyrek', try: 'TL' };
const statusTone = { forming: 'gold', drawn: 'default', active: 'success', completed: 'success' };
const statusText = { forming: 'Üye topluyor', drawn: 'Sıra belirlendi', active: 'Aktif', completed: 'Tamamlandı' };

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([api.listGroups(), api.summary().catch(() => null)]);
      setGroups(g.groups);
      if (s) setSummary(s);
    } catch (e) { /* sessiz */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
          <Text style={{ fontSize: 20 }}>👤</Text>
        </TouchableOpacity>
        <Text style={font.h2}>Altın Günü</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Altın Bakiyem</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={styles.balanceValue}>{summary ? summary.goldGram.toFixed(2) : '0.00'}</Text>
          <Text style={styles.balanceUnit}>gr</Text>
          <Text style={styles.coin}>🪙</Text>
        </View>
        {summary ? (<Text style={styles.balanceTry}>≈ {summary.goldValueTry.toLocaleString('tr-TR')} ₺</Text>) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{summary ? summary.activeGroups : 0}</Text>
            <Text style={styles.statLbl}>Aktif Grup</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{summary ? summary.totalPaid.toLocaleString('tr-TR') : 0}</Text>
            <Text style={styles.statLbl}>Toplam Ödenen</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.actionEmoji}>➕</Text>
          <Text style={styles.actionText}>Yeni Grup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Join', {})}>
          <Text style={styles.actionEmoji}>🔑</Text>
          <Text style={styles.actionText}>Kodla Katıl</Text>
        </TouchableOpacity>
      </View>

      <Text style={[font.h2, { marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>Gruplarım</Text>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Text style={{ fontSize: 44 }}>🪙</Text>
            <Text style={[font.dim, { marginTop: spacing.sm }]}>Henüz grubun yok. Yeni bir tane kur veya QR ile katıl!</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  balanceCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.gold + '55', marginBottom: spacing.md },
  balanceLabel: { color: colors.textDim, fontSize: 13, marginBottom: 6 },
  balanceValue: { color: colors.gold, fontSize: 40, fontWeight: '800' },
  balanceUnit: { color: colors.gold, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  coin: { fontSize: 26, marginBottom: 6 },
  balanceTry: { color: colors.text, fontSize: 15, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border },
  statNum: { color: colors.text, fontSize: 18, fontWeight: '700' },
  statLbl: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  actionBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionEmoji: { fontSize: 22, marginBottom: 4 },
  actionText: { color: colors.text, fontWeight: '700' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
