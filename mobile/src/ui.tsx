import { Feather } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, type Destination, type Story } from './ApiService';

export const color = {
  paper: '#F7F3E8',
  surface: '#FFFCF4',
  ink: '#172F27',
  forest: '#1A4437',
  leaf: '#DCE8D8',
  muted: '#526358',
  line: '#DBDED0',
  gold: '#F7C877',
  paleGold: '#F5E3BA',
  brown: '#745025',
  error: '#982D27',
};

export const font = {
  display: 'JejakDisplay',
  body: 'JejakBody',
  medium: 'JejakMedium',
  bold: 'JejakBold',
};

type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 21, tint = color.forest }: {
  name: IconName;
  size?: number;
  tint?: string;
}) {
  return <Feather name={name} size={size} color={tint} />;
}

export function Page({ children, bottomSafe = false }: PropsWithChildren<{ bottomSafe?: boolean }>) {
  const edges = bottomSafe
    ? ['top', 'left', 'right', 'bottom'] as const
    : ['top', 'left', 'right'] as const;

  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Icon name="compass" size={22} tint={color.gold} /></View>
      <Text style={styles.brandName}>JejakNusantara</Text>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}>
      <Icon name="arrow-left" size={19} />
      <Text style={styles.backText}>Kembali</Text>
    </Pressable>
  );
}

export function Button({ children, onPress, icon }: {
  children: string;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonText}>{children}</Text>
      {icon && <Icon name={icon} size={17} tint={color.surface} />}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.feedback} accessibilityLiveRegion="polite">
      <ActivityIndicator color={color.forest} size="small" />
      <Text style={styles.feedbackText}>Memuat JejakNusantara…</Text>
    </View>
  );
}

export function Feedback({ title, description, action, onPress }: {
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.feedback} accessibilityLiveRegion="polite">
      <Text accessibilityRole="header" style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackText}>{description}</Text>
      {action && onPress && <Button onPress={onPress}>{action}</Button>}
    </View>
  );
}

export function LoadError({ error, retry, onBack, missingTitle }: {
  error: unknown;
  retry: () => void;
  onBack?: () => void;
  missingTitle?: string;
}) {
  if (error instanceof ApiError && error.status === 404 && onBack && missingTitle) {
    return <Feedback title={missingTitle} description="Konten ini mungkin sudah dipindahkan." action="Kembali" onPress={onBack} />;
  }
  const description = error instanceof ApiError && error.status === 429
    ? 'Tunggu sebentar, lalu coba lagi.'
    : 'Periksa koneksi Anda, lalu coba lagi.';
  return <Feedback title="Katalog belum bisa dimuat" description={description} action="Coba lagi" onPress={retry} />;
}

export function DestinationRow({ item, onPress }: { item: Destination; onPress: () => void }) {
  const isNature = item.category.toLowerCase() === 'alam';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Buka destinasi ' + item.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, isNature ? styles.nature : styles.culture]}>
        <Icon name={isNature ? 'map' : 'flag'} tint={isNature ? color.forest : color.brown} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowMeta}>{item.category + ' · ' + item.region}</Text>
        <Text style={styles.rowTitle}>{item.name}</Text>
      </View>
      <Icon name="arrow-up-right" size={19} />
    </Pressable>
  );
}

export function StoryRow({ item, onPress }: { item: Story; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Baca cerita ' + item.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, styles.culture]}><Icon name="book-open" tint={color.brown} /></View>
      <View style={styles.rowContent}>
        <Text style={styles.rowMeta}>{item.category}</Text>
        <Text style={styles.rowTitle}>{item.title}</Text>
      </View>
      <Icon name="arrow-up-right" size={19} />
    </Pressable>
  );
}

export const textStyle = StyleSheet.create({
  title: { color: color.ink, fontFamily: font.display, fontSize: 47, letterSpacing: -0.6 },
  section: { color: color.ink, fontFamily: font.display, fontSize: 32 },
  body: { color: color.ink, fontFamily: font.body, fontSize: 16, lineHeight: 26 },
  supporting: { color: color.muted, fontFamily: font.body, fontSize: 14, lineHeight: 21 },
  label: { color: color.ink, fontFamily: font.medium, fontSize: 15 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 672, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  brand: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.forest },
  brandName: { color: color.ink, fontFamily: font.bold, fontSize: 19, letterSpacing: -0.4 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: 44, paddingRight: 12 },
  backText: { color: color.forest, fontFamily: font.medium, fontSize: 15 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: color.forest, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: color.surface, fontFamily: font.bold, fontSize: 15 },
  pressed: { opacity: 0.78 },
  chip: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 15, borderColor: color.line, borderWidth: 1, borderRadius: 24, justifyContent: 'center', backgroundColor: color.surface },
  chipSelected: { backgroundColor: color.forest, borderColor: color.forest },
  chipText: { color: color.forest, fontFamily: font.medium, fontSize: 14 },
  chipTextSelected: { color: color.surface },
  feedback: { paddingHorizontal: 18, paddingVertical: 25, alignItems: 'center', gap: 10 },
  feedbackTitle: { color: color.ink, fontFamily: font.bold, fontSize: 17, textAlign: 'center' },
  feedbackText: { color: color.muted, fontFamily: font.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  row: { borderTopColor: color.line, borderTopWidth: 1, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 73 },
  rowPressed: { backgroundColor: color.leaf },
  rowIcon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nature: { backgroundColor: color.leaf },
  culture: { backgroundColor: color.paleGold },
  rowContent: { flex: 1 },
  rowMeta: { color: color.muted, fontFamily: font.medium, fontSize: 12 },
  rowTitle: { color: color.ink, fontFamily: font.bold, fontSize: 17, marginTop: 2 },
});
