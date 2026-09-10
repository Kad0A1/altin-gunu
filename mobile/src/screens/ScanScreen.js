import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, font, radius } from '../theme/theme';
import { Button } from '../components/UI';

function extractCode(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/join\/([A-Z0-9]{6})/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Z0-9]{6}$/i.test(s)) return s.toUpperCase();
  return null;
}

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useFocusEffect(useCallback(() => { setScanned(false); }, []));

  function onScan({ data }) {
    if (scanned) return;
    const code = extractCode(data);
    if (!code) return;
    setScanned(true);
    navigation.navigate('Join', { code });
  }

  if (!permission) {
    return <View style={styles.center}><Text style={font.dim}>Kamera hazırlanıyor...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 44, marginBottom: spacing.md }}>📷</Text>
        <Text style={[font.h2, { textAlign: 'center' }]}>QR ile Gruba Katıl</Text>
        <Text style={[font.dim, { textAlign: 'center', marginVertical: spacing.md }]}>
          Arkadaşının grup QR kodunu okutmak için kamera iznine ihtiyacımız var.
        </Text>
        <Button title="Kamera İzni Ver" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={{ flex: 1 }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onScan} />
      <View style={styles.header}><Text style={styles.headerText}>Grup QR kodunu okut</Text></View>
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>QR'ı çerçevenin içine hizala</Text>
      </View>
      <View style={styles.bottom}>
        <TouchableOpacity onPress={() => navigation.navigate('Join', {})}>
          <Text style={styles.manual}>QR yok mu? Kodu elle gir →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: '700', backgroundColor: '#0008', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: colors.gold, borderRadius: 24, backgroundColor: 'transparent' },
  hint: { color: '#fff', marginTop: spacing.md, backgroundColor: '#0008', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  bottom: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  manual: { color: colors.gold, fontSize: 15, fontWeight: '700', backgroundColor: '#000a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
});
