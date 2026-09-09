import React from 'react';
import {
  TouchableOpacity, Text, View, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, radius, spacing, font } from '../theme/theme';

export function Button({ title, onPress, loading, variant = 'primary', style }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnGhost,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000' : colors.gold} />
      ) : (
        <Text style={[styles.btnText, { color: isPrimary ? '#1A1A22' : colors.gold }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[font.dim, { marginBottom: 6 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ text, tone = 'default' }) {
  const map = {
    default: colors.surfaceAlt, success: colors.success,
    gold: colors.gold, danger: colors.danger,
  };
  return (
    <View style={[styles.pill, { backgroundColor: map[tone] + '22', borderColor: map[tone] }]}>
      <Text style={{ color: map[tone], fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.gold },
  btnGhost: { borderWidth: 1.5, borderColor: colors.gold, backgroundColor: 'transparent' },
  btnText: { fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 52, color: colors.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    borderWidth: 1, alignSelf: 'flex-start',
  },
});
