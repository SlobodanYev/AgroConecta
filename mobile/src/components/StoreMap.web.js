import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function StoreMap({ stores, selectedId, onSelect }) {
  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <Text style={styles.area}>ARICA · AZAPA · LLUTA</Text>
      {stores.map((store, index) => (
        <Pressable key={store.id} onPress={() => onSelect(store)} style={[styles.marker, positions[index], store.id === selectedId && styles.markerActive]}>
          <Text style={styles.markerText}>●</Text>
        </Pressable>
      ))}
      <Text style={styles.webNote}>El mapa interactivo está disponible en la aplicación móvil.</Text>
    </View>
  );
}

const positions = [{ left: '22%', top: '54%' }, { left: '48%', top: '24%' }, { left: '73%', top: '42%' }];
const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E7EFE4', borderWidth: 1, borderColor: '#D3E0D4' },
  road: { position: 'absolute', height: 20, width: '120%', backgroundColor: '#CAD3C7', transform: [{ rotate: '-13deg' }] },
  roadOne: { top: 126, left: -25 },
  roadTwo: { top: 210, left: -30, transform: [{ rotate: '12deg' }] },
  area: { position: 'absolute', left: 16, top: 16, color: '#55735D', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  marker: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: '#218A46', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  markerActive: { backgroundColor: '#0D4D28', transform: [{ scale: 1.15 }] },
  markerText: { color: '#FFFFFF' },
  webNote: { position: 'absolute', right: 10, bottom: 8, color: '#536158', backgroundColor: 'rgba(255,255,255,.9)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, fontSize: 9 },
});
