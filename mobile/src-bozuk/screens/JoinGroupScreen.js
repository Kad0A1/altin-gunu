import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { api } from '../api/client';
import { Button, Field, Card } from '../components/UI';
import { colors, spacing, font } from '../theme/theme';

export default function JoinGroupScreen({ route, navigation }) {
  // Deep link ile gelen kod: route.params.code
  const [code, setCode] = useState(route.params?.code || '');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (route.params?.code) doPreview(route.params.code); }, [route.params?.code]);

  async function doPreview(c) {
    setError(''); setPreview(null);
    try { const res = await api.previewByCode(c.toUpperCase()); setPreview(res.group); }
    catch (e) { setError(e.message); }
  }

  async function join() {
    setLoading(true); setError('');
    try {
      await api.joinByCode(code.toUpperCase());
      Alert.alert('Katıldın! 🎉', `${preview.name} grubuna eklendin.`);
      navigation.replace('GroupDetail', { id: preview.id });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <View style={styles.wrap}>
      <Text style={font.h2}>Gruba Katıl</Text>
      <Text style={[font.dim, { marginVertical: spacing.sm }]}>Arkadaşının paylaştığı 6 haneli davet kodunu gir.</Text>

      <Field placeholder="GX7K2Q" autoCapitalize="characters" maxLength={6}
        value={code} onChangeText={setCode} />
      <Button title="Grubu Getir" variant="ghost" onPress={() => doPreview(code)} />

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {preview && (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={font.h2}>{preview.name}</Text>
          <Text style={[font.dim, { marginVertical: 6 }]}>
            {preview.currentMembers}/{preview.memberCount} üye • {preview.amount} {preview.unit}/ay
          </Text>
          <Button title="Bu Gruba Katıl" onPress={join} loading={loading} style={{ marginTop: spacing.sm }} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  err: { color: colors.danger, marginTop: spacing.sm },
});
