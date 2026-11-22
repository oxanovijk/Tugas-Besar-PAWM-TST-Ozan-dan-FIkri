import type { ComponentProps, PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, font, Icon, textStyle } from './ui';

export function DetailIntro({ title, meta, icon, variant }: {
  title: string;
  meta: string;
  icon: ComponentProps<typeof Icon>['name'];
  variant: 'place' | 'story';
}) {
  const story = variant === 'story';
  return (
    <View style={[styles.intro, story && styles.story]}>
      <Icon name={icon} size={28} tint={story ? color.brown : color.gold} />
      <Text style={[styles.meta, story && styles.storyMeta]}>{meta}</Text>
      <Text accessibilityRole="header" style={[textStyle.title, styles.title, story && styles.storyTitle]}>{title}</Text>
    </View>
  );
}

export function DetailSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[textStyle.section, styles.sectionTitle]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 10, padding: 22, gap: 9, borderRadius: 16, backgroundColor: color.forest },
  story: { backgroundColor: color.paleGold },
  meta: { color: color.leaf, fontFamily: font.medium, fontSize: 14 },
  storyMeta: { color: color.brown },
  title: { color: color.surface },
  storyTitle: { color: color.ink },
  section: { marginTop: 22 },
  sectionTitle: { marginBottom: 6 },
});
