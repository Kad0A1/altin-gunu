import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { api } from '../api/client';
import { Button, Field } from '../components/UI';
import { colors, spacing, font } from '../theme/theme';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function validate() {
    if (!name.trim()) return 'Ad Soyad gerekli';
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      return 'Kullanıcı adı 3-20 karakter olmalı (harf, rakam, _)';
    if (!phone.trim()) return 'Telefon gerekli';
    return null;
  }

  async function onRegister() {
    const v = validate();
    if (v) return setError(v);
    setLoading(true); setError('');
    try {
      const res = await api.registerRequest(name.trim(), username.trim(), phone.trim());
      navigation.navigate('Otp', { mode: 'register', name: name.trim(), username: username.trim(), phone: phone.trim(), devHint: res.devHint });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>🪙</Text>
          <Text style={font.h1}>Kayıt Ol</Text>
          <Text style={[font.dim, { textAlign: 'center', marginTop: 6 }]}>
            Hesap oluştur. Kullanıcı adın ve telefonun sana özeldir, başkası kullanamaz.
          </Text>
        </View>

        <Field label="Ad Soyad" placeholder="Adınız Soyadınız" value={name} onChangeText={setName} />
        <Field label="Kullanıcı Adı" placeholder="benzersiz_kullanici_adi" autoCapitalize="none"
          value={username} onChangeText={setUsername} />
        <Field label="Telefon" placeholder="05XX XXX XX XX" keyboardType="phone-pad"
          value={phone} onChangeText={setPhone} />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button title="Kayıt Ol ve Doğrula" onPress={onRegister} loading={loading} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.gold, textAlign: 'center', fontWeight: '700' }}>
            Zaten hesabın var mı? Giriş Yap →
          </Text>
        </TouchableOpacity>

        <Text style={[font.dim, { textAlign: 'center', marginTop: spacing.md }]}>
          Kayıt olarak KVKK Aydınlatma Metni'ni kabul edersiniz.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 56, marginBottom: spacing.sm },
  err: { color: colors.danger, marginBottom: spacing.sm },
});
