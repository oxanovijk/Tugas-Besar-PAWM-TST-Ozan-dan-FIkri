import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { catalog } from '../../src/catalog';
import { Brand, Chip, color, DestinationRow, Feedback, font, Icon, LoadError, Loading, Page, textStyle } from '../../src/ui';
import { useResource } from '../../src/useResource';

const landscape = require('../../assets/jejak-valley.png');
const loadCatalogue = (signal: AbortSignal) => catalog.listDestinations({}, signal);

export default function ExploreScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const filtered = !!(query || region || category);

  const loadFiltered = useCallback(
    (signal: AbortSignal) => catalog.listDestinations({ query, region, category }, signal),
    [query, region, category],
  );
  const fullCatalog = useResource(loadCatalogue);
  const filteredCatalog = useResource(filtered ? loadFiltered : null);
  const { state, retry } = filtered ? filteredCatalog : fullCatalog;

  const items = fullCatalog.state.status === 'ready' ? fullCatalog.state.data : [];
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const regions = [...new Set(items.map((item) => item.region))].sort();

  function submitSearch() {
    Keyboard.dismiss();
    if (fullCatalog.state.status === 'error') fullCatalog.retry();
    setQuery(draft.trim());
  }

  function clearSearch() {
    setDraft('');
    setQuery('');
  }

  function resetFilters() {
    clearSearch();
    setRegion('');
    setCategory('');
  }

  return (
    <Page>
      <Brand />
      <View style={styles.hero}>
        <Image source={landscape} style={styles.landscape} resizeMode="cover" />
        <View style={styles.heroShade}>
          <Text accessibilityRole="header" style={styles.heroTitle}>Jelajahi jejak budaya.</Text>
          <Text style={styles.heroText}>Temukan destinasi dan cerita di baliknya.</Text>
        </View>
      </View>

      <View style={styles.search}>
        <Icon name="search" tint={color.muted} />
        <TextInput
          accessibilityLabel="Cari destinasi atau cerita"
          placeholder="Cari destinasi atau cerita"
          placeholderTextColor={color.muted}
          style={styles.searchInput}
          maxLength={100}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          selectionColor={color.forest}
        />
        {draft.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" onPress={clearSearch} style={styles.searchClear}>
            <Icon name="x" size={18} />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Cari" onPress={submitSearch} style={styles.searchAction}>
          <Icon name="arrow-right" size={20} tint={color.surface} />
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View style={styles.chips} accessibilityLabel="Kategori">
          <Chip label="Semua" selected={!category} onPress={() => setCategory('')} />
          {categories.map((name) => (
            <Chip key={name} label={name} selected={category === name} onPress={() => setCategory(category === name ? '' : name)} />
          ))}
        </View>
      )}
      {regions.length > 1 && (
        <View style={styles.regions}>
          <Text style={textStyle.label}>Wilayah</Text>
          <View style={styles.chips}>
            {regions.map((name) => (
              <Chip key={name} label={name} selected={region === name} onPress={() => setRegion(region === name ? '' : name)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.results}>
        <View style={styles.resultsHeader}>
          <Text accessibilityRole="header" style={textStyle.section}>Destinasi</Text>
          {state.status === 'ready' && <Text style={textStyle.supporting}>{state.data.length + ' tempat'}</Text>}
        </View>
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError error={state.error} retry={retry} />}
        {state.status === 'ready' && (
          state.data.length ? state.data.map((item) => (
            <DestinationRow key={item.id} item={item} onPress={() => router.push({
              pathname: '/destination/[id]', params: { id: item.id },
            })} />
          )) : (
            <Feedback
              title={filtered ? 'Destinasi tidak ditemukan' : 'Katalog masih kosong'}
              description={filtered ? 'Coba kata kunci atau filter lain.' : 'Coba lagi untuk memeriksa pembaruan katalog.'}
              action={filtered ? 'Hapus filter' : 'Muat ulang'}
              onPress={filtered ? resetFilters : retry}
            />
          )
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 224, marginTop: 15, borderRadius: 16, overflow: 'hidden', backgroundColor: color.forest },
  landscape: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroShade: { flex: 1, minHeight: 224, backgroundColor: 'rgba(12, 35, 28, 0.39)', justifyContent: 'flex-end', padding: 20 },
  heroTitle: { color: color.surface, fontFamily: font.display, fontSize: 47, lineHeight: 48, maxWidth: 265, letterSpacing: -0.6 },
  heroText: { color: color.surface, fontFamily: font.medium, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 260 },
  search: { marginTop: 16, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 4, minHeight: 54, gap: 5, borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  searchInput: { minWidth: 45, minHeight: 46, flex: 1, paddingHorizontal: 4, color: color.ink, fontFamily: font.body, fontSize: 15 },
  searchClear: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchAction: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: color.forest },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  regions: { marginTop: 16 },
  results: { marginTop: 23 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, gap: 5 },
});
