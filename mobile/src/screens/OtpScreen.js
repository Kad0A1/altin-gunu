import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api, setToken } from '../api/client';
import { Button, Field } from '../components/UI';
import { colors, spacing, font } from '../theme/theme';

export default function OtpScreen({ route, navigation }) {
  const { phone, name, devHint } = route.params;
  const [code, setCode] = useState(devHint || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onVerify() {
    setLoading(true); setError('');
    try {
      const res = await api.verifyOtp(phone, code.trim(), name);
      await setToken(res.token);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <View style={styles.wrap}>
      <Text style={font.h2}>Doğrulama Kodu</Text>
      <Text style={[font.dim, { marginVertical: spacing.sm }]}>
        {phone} numarasına gönderilen 6 haneli kodu girin.
      </Text>
      {devHint ? (
        <Text style={[font.dim, { color: colors.gold, marginBottom: spacing.sm }]}>
          (Demo kodu: {devHint})
        </Text>
      ) : null}
      <Field
        placeholder="______"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button title="Doğrula ve Giriş Yap" onPress={onVerify} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.bg },
  err: { color: colors.danger, marginBottom: spacing.sm },
});
