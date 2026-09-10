import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../api/client';
import { Button, Field } from '../components/UI';
import { colors, spacing, font, radius } from '../theme/theme';

const UNITS = [
  { key: 'gram', label: 'Gram Altın' },
  { key: 'ceyrek', label: 'Çeyrek' },
  { key: 'try', label: 'TL' },
];

export default function CreateGroupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [memberCount, setMemberCount] = useState('10');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState('gram');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onCreate() {
    if (!name.trim()) return setError('Grup adı gerekli');
    setLoading(true); setError('');
    try {
      const res = await api.createGroup({
        name: name.trim(),
        memberCount: parseInt(memberCount, 10),
        amount: parseFloat(amount),
        unit,
      });
      navigation.replace('GroupDetail', { id: res.group.id });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Field label="Grup Adı" placeholder="Örn. Ofis Altın Günü" value={name} onChangeText={setName} />

      <Text style={[font.dim, { marginBottom: 6 }]}>Birim</Text>
      <View style={styles.unitRow}>
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u.key}
            onPress={() => setUnit(u.key)}
            style={[styles.unitBtn, unit === u.key && styles.unitActive]}>
            <Text style={{ color: unit === u.key ? '#1A1A22' : colors.text, fontWeight: '700' }}>
              {u.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Kişi Sayısı" keyboardType="number-pad" value={memberCount} onChangeText={setMemberCount} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Kişi Başı / Ay" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        </View>
      </View>

      <View style={styles.info}>
        <Text style={font.dim}>
          Toplam havuz her tur: <Text style={{ color: colors.gold }}>
          {(parseFloat(amount || 0) * parseInt(memberCount || 0, 10)) || 0} {unit}</Text>
        </Text>
        <Text style={[font.dim, { marginTop: 4 }]}>
          Süre: {memberCount || 0} ay ({memberCount || 0} tur)
        </Text>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button title="Grubu Oluştur" onPress={onCreate} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
  unitRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  unitBtn: {
    flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  unitActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  info: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  err: { color: colors.danger, marginBottom: spacing.sm },
});
