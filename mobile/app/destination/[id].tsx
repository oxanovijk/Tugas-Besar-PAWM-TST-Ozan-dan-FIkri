import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { catalog } from '../../src/catalog';
import { DetailIntro, DetailSection } from '../../src/detailUi';
import { BackButton, Icon, LoadError, Loading, Page, StoryRow, textStyle } from '../../src/ui';
import { useResource } from '../../src/useResource';

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => catalog.getDestination(id, signal), [id]);
  const { state, retry } = useResource(load);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <Page bottomSafe>
      <BackButton onPress={goBack} />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <LoadError error={state.error} retry={retry} onBack={goBack} missingTitle="Destinasi tidak ditemukan" />}
      {state.status === 'ready' && (
        <>
          <DetailIntro title={state.data.name} meta={state.data.category + ' · ' + state.data.region} variant="place" icon="map" />
          <DetailSection title="Tentang destinasi">
            <Text style={textStyle.body}>{state.data.description}</Text>
          </DetailSection>
          <DetailSection title="Informasi kunjungan">
            <Text style={textStyle.body}>{state.data.visit_information}</Text>
            <View style={styles.coordinates}>
              <Icon name="map-pin" size={16} />
              <Text style={textStyle.supporting}>
                {state.data.latitude.toFixed(4) + ', ' + state.data.longitude.toFixed(4)}
              </Text>
            </View>
          </DetailSection>
          <DetailSection title="Cerita budaya">
            {state.data.stories.length ? state.data.stories.map((item) => (
              <StoryRow key={item.id} item={item} onPress={() => router.push({
                pathname: '/story/[id]', params: { id: item.id },
              })} />
            )) : <Text style={textStyle.supporting}>Belum ada cerita terkait.</Text>}
          </DetailSection>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  coordinates: { marginTop: 8, flexDirection: 'row', gap: 6, alignItems: 'center' },
});
