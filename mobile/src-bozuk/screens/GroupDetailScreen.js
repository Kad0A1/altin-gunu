import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Share, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../api/client';
import { Button, Card, Pill } from '../components/UI';
import { colors, spacing, font, radius } from '../theme/theme';

const APP_URL = 'https://altingunu.app';

export default function GroupDetailScreen({ route }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.getGroup(id)); } catch (e) { Alert.alert('Hata', e.message); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <View style={styles.wrap} />;
  const { group, members, rounds } = data;
  const inviteLink = `${APP_URL}/join/${group.inviteCode}`;

  async function shareLink() {
    await Share.share({
      message: `"${group.name}" altın günü grubuma katıl! 🪙\nDavet kodu: ${group.inviteCode}\n${inviteLink}`,
    });
  }

  async function draw() {
    setBusy(true);
    try { await api.drawOrder(id); await load(); Alert.alert('Kura çekildi', 'Sıra adil biçimde belirlendi.'); }
    catch (e) { Alert.alert('Hata', e.message); }
    finally { setBusy(false); }
  }

  async function pay(roundId) {
    setBusy(true);
    try {
      await api.addCard().catch(() => {}); // demo: kart yoksa ekle
      const res = await api.payRound(roundId);
      await load();
      if (res.roundComplete)
        Alert.alert('🎉 Altın yolda!', `${res.gold.grams} gr altın alındı ve sıradaki üyeye kargolandı.\nTakip: ${res.gold.order.trackingNo}`);
      else
        Alert.alert('Ödeme alındı', 'Diğer üyeler ödeyince altın gönderilecek.');
    } catch (e) { Alert.alert('Hata', e.message); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={font.h1}>{group.name}</Text>
        <Pill text={group.status} tone="gold" />
      </View>
      <Text style={font.dim}>{group.memberCount} kişilik • {group.amount} {group.unit}/ay</Text>

      {/* Davet kartı */}
      <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={font.h2}>Arkadaşlarını davet et</Text>
        <View style={styles.qrBox}>
          <QRCode value={inviteLink} size={140} backgroundColor="white" />
        </View>
        <Text style={[font.dim, { marginTop: spacing.sm }]}>Davet Kodu</Text>
        <Text style={styles.code}>{group.inviteCode}</Text>
        <Button title="Linki Paylaş" onPress={shareLink} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
      </Card>

      {/* Üyeler */}
      <Text style={[font.h2, { marginTop: spacing.md }]}>Üyeler ({members.length}/{group.memberCount})</Text>
      {members.sort((a, b) => (a.slotNo || 99) - (b.slotNo || 99)).map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <Text style={styles.slot}>{m.slotNo ? `#${m.slotNo}` : '—'}</Text>
          <Text style={{ color: colors.text, flex: 1 }}>{m.user.name}</Text>
          {m.role === 'owner' ? <Pill text="Kurucu" tone="gold" /> : null}
        </View>
      ))}

      {/* Kura */}
      {group.status === 'forming' && (
        <Button title="Kura Çek & Sırayı Belirle" onPress={draw} loading={busy}
          style={{ marginTop: spacing.md }} />
      )}

      {/* Turlar */}
      {rounds.length > 0 && (
        <>
          <Text style={[font.h2, { marginTop: spacing.lg }]}>Takvim</Text>
          {rounds.map((r) => {
            const b = members.find((m) => m.userId === r.beneficiaryId);
            const done = r.status === 'fulfilled';
            return (
              <Card key={r.id}>
                <View style={styles.head}>
                  <Text style={font.body}>Tur {r.roundNo} • {b?.user.name}</Text>
                  <Pill text={done ? 'Gönderildi' : 'Bekliyor'} tone={done ? 'success' : 'default'} />
                </View>
                <Text style={[font.dim, { marginVertical: 6 }]}>
                  {new Date(r.dueDate).toLocaleDateString('tr-TR')}
                </Text>
                {!done && (
                  <Button title={`Öde (${group.amount} ${group.unit})`} onPress={() => pay(r.id)} loading={busy} variant="ghost" />
                )}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qrBox: { backgroundColor: 'white', padding: 12, borderRadius: radius.md, marginTop: spacing.md },
  code: { fontSize: 28, fontWeight: '800', color: colors.gold, letterSpacing: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  slot: { color: colors.gold, fontWeight: '800', width: 36 },
});
