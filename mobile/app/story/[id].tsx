import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { catalog } from '../../src/catalog';
import { DetailIntro, DetailSection } from '../../src/detailUi';
import { BackButton, color, DestinationRow, LoadError, Loading, Page, textStyle } from '../../src/ui';
import { useResource } from '../../src/useResource';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => catalog.getStory(id, signal), [id]);
  const { state, retry } = useResource(load);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <Page bottomSafe>
      <BackButton onPress={goBack} />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError error={state.error} retry={retry} onBack={goBack} missingTitle="Cerita budaya tidak ditemukan" />}
      {state.status === 'ready' && (
        <>
          <DetailIntro title={state.data.title} meta={state.data.category} variant="story" icon="book-open" />
          <DetailSection title="Kisah">
            <Text style={textStyle.body}>{state.data.narrative}</Text>
          </DetailSection>
          <View style={styles.source}>
            <Text style={textStyle.label}>Sumber cerita</Text>
            <Text style={textStyle.supporting}>{state.data.source}</Text>
          </View>
          <DetailSection title="Destinasi terkait">
            {state.data.destinations.length ? state.data.destinations.map((item) => (
              <DestinationRow key={item.id} item={item} onPress={() => router.push({
                pathname: '/destination/[id]', params: { id: item.id },
              })} />
            )) : <Text style={textStyle.supporting}>Belum ada destinasi terkait.</Text>}
          </DetailSection>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  source: { marginTop: 16, padding: 14, gap: 4, borderRadius: 12, backgroundColor: color.paleGold },
});
