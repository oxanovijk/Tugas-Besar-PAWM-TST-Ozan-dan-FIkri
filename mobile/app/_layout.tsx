import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { color, font, Loading } from '../src/ui';

export default function RootLayout() {
  const [ready, error] = useFonts({
    [font.display]: InstrumentSerif_400Regular,
    [font.body]: DMSans_400Regular,
    [font.medium]: DMSans_600SemiBold,
    [font.bold]: DMSans_700Bold,
  });

  if (!ready && !error) {
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.paper }}><Loading /></View>;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="destination/[id]" />
        <Stack.Screen name="story/[id]" />
      </Stack>
    </>
  );
}
