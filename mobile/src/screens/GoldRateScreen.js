import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { colors, spacing, font, radius } from '../theme/theme';

export default function GoldRateScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.goldPrice()); setErr(false); }
    catch (e) { setErr(true); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Canlı his: 20 sn'de bir yenile
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const isLive = data?.live;

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Text style={font.h1}>Altın Kuru</Text>
        <View style={[styles.liveBadge, { backgroundColor: isLive ? colors.success + '22' : colors.textDim + '22', borderColor: isLive ? colors.success : colors.textDim }]}>
          <View style={[styles.dot, { backgroundColor: isLive ? colors.success : colors.textDim }]} />
          <Text style={{ color: isLive ? colors.success : colors.textDim, fontSize: 12, fontWeight: '700' }}>
            {isLive ? 'CANLI' : 'ÇEVRİMDIŞI'}
          </Text>
        </View>
      </View>

      <Text style={[font.dim, { paddingHorizontal: spacing.lg }]}>
        {data ? `Son güncelleme: ${new Date(data.updatedAt).toLocaleTimeString('tr-TR')}` : 'Yükleniyor...'}
      </Text>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.gold}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {!data && !err ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
        ) : err ? (
          <Text style={[font.dim, { textAlign: 'center', marginTop: 40 }]}>
            Fiyat alınamadı. Aşağı çekip tekrar deneyin.
          </Text>
        ) : (
          data.prices.map((p) => {
            const up = (p.changePercent ?? 0) >= 0;
            return (
              <View key={p.key} style={styles.rateCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rateLabel}>{p.label}</Text>
                  <Text style={styles.rateUnit}>{p.unit}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ratePrice}>
                    {p.buy.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </Text>
                  {p.changePercent !== undefined && p.changePercent !== null ? (
                    <Text style={[styles.change, { color: up ? colors.success : colors.danger }]}>
                      {up ? '▲' : '▼'} %{Math.abs(p.changePercent).toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.note}>
          <Text style={font.dim}>
            {isLive
              ? `💡 Fiyatlar canlı piyasadan alınmaktadır (kaynak: ${data?.source}). Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`
              : '⚠️ Canlı fiyata şu an ulaşılamıyor; en son bilinen/temsili değer gösteriliyor.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rateCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.gold + '44', marginBottom: spacing.md },
  rateLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  rateUnit: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  ratePrice: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  change: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  note: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
});
