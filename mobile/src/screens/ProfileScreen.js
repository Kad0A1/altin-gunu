import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api, setToken } from '../api/client';
import { Button, Field, Card } from '../components/UI';
import { colors, spacing, font, radius } from '../theme/theme';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [iban, setIban] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.me();
        setName(user.name || ''); setPhone(user.phone || '');
        setIban(user.iban || ''); setAddress(user.address || '');
      } catch (e) { Alert.alert('Hata', e.message); }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), iban: iban.trim(), address: address.trim() });
      Alert.alert('Kaydedildi ✓', 'Profil bilgilerin güncellendi.');
      navigation.goBack();
    } catch (e) { Alert.alert('Hata', e.message); }
    finally { setSaving(false); }
  }

  async function logout() {
    await setToken(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}><Text style={{ fontSize: 40 }}>👤</Text></View>
        <Text style={[font.h2, { marginTop: spacing.sm }]}>{name || 'Üye'}</Text>
        <Text style={font.dim}>{phone}</Text>
      </View>

      <Card>
        <Field label="Ad Soyad" value={name} onChangeText={setName} placeholder="Adınız" />
        <Field label="Telefon (değiştirilemez)" value={phone} editable={false} />
        <Field label="IBAN (altın teslimat/iade için)" value={iban} onChangeText={setIban} placeholder="TR.. .. .. .." autoCapitalize="characters" />
        <Field label="Teslimat Adresi" value={address} onChangeText={setAddress} placeholder="Altının gönderileceği adres" multiline />
        <Button title="Kaydet" onPress={save} loading={saving} />
      </Card>

      <View style={styles.kyc}>
        <Text style={[font.body, { fontWeight: '700', marginBottom: 4 }]}>🔒 Kimlik Doğrulama (KYC)</Text>
        <Text style={font.dim}>
          Gerçek altın teslimatı ve ödeme için MASAK gereği TC kimlik doğrulaması gerekir. Bu demo sürümünde devre dışıdır.
        </Text>
      </View>

      <Button title="Çıkış Yap" variant="ghost" onPress={logout} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  kyc: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
});
