import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../api/client';
import { Button, Field } from '../components/UI';
import { colors, spacing, font } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onContinue() {
    if (!phone.trim()) return setError('Telefon numarası gerekli');
    setLoading(true); setError('');
    try {
      const res = await api.requestOtp(phone.trim());
      navigation.navigate('Otp', { phone: phone.trim(), name: name.trim(), devHint: res.devHint });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>🪙</Text>
        <Text style={font.h1}>Altın Günü</Text>
        <Text style={[font.dim, { textAlign: 'center', marginTop: 6 }]}>
          Arkadaşlarınla dijital altın günü kur, otomatik öde, sıran gelince altınını kapına aldır.
        </Text>
      </View>

      <Field label="Ad Soyad" placeholder="Adınız" value={name} onChangeText={setName} />
      <Field
        label="Telefon"
        placeholder="05XX XXX XX XX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button title="Devam Et" onPress={onContinue} loading={loading} />
      <Text style={[font.dim, { textAlign: 'center', marginTop: spacing.md }]}>
        Devam ederek KVKK Aydınlatma Metni'ni kabul edersiniz.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.bg },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 56, marginBottom: spacing.sm },
  err: { color: colors.danger, marginBottom: spacing.sm },
});
