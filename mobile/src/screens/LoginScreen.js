import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { api } from '../api/client';
import { Button, Field } from '../components/UI';
import { colors, spacing, font } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onLogin() {
    if (!username.trim() || !phone.trim()) return setError('Kullanıcı adı ve telefon gerekli');
    setLoading(true); setError('');
    try {
      const res = await api.loginRequest(username.trim(), phone.trim());
      navigation.navigate('Otp', { mode: 'login', phone: phone.trim(), username: username.trim(), devHint: res.devHint });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>🪙</Text>
        <Text style={font.h1}>Altın Günü</Text>
        <Text style={[font.dim, { textAlign: 'center', marginTop: 6 }]}>
          Hesabınla giriş yap. Hesabın yoksa hemen kayıt ol.
        </Text>
      </View>

      <Field label="Kullanıcı Adı" placeholder="kullanici_adi" autoCapitalize="none"
        value={username} onChangeText={setUsername} />
      <Field label="Telefon" placeholder="05XX XXX XX XX" keyboardType="phone-pad"
        value={phone} onChangeText={setPhone} />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button title="Giriş Yap" onPress={onLogin} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.gold, textAlign: 'center', fontWeight: '700' }}>
          Hesabın yok mu? Kayıt Ol →
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.bg },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 56, marginBottom: spacing.sm },
  err: { color: colors.danger, marginBottom: spacing.sm },
});
