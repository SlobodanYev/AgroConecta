import { useMemo } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

function serialized(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function createMapHtml({ region, stores, selectedId, userLocation }) {
  const data = serialized({ region, stores, selectedId, userLocation });
  const zoom = region.latitudeDelta <= 0.09 ? 12 : 10;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html,body,#map{width:100%;height:100%;margin:0;background:#e7efe4;font-family:Arial,sans-serif}
    .leaflet-popup-content{margin:10px 12px;line-height:1.35;color:#143c21}
    .leaflet-popup-content b{font-size:14px}.leaflet-control-attribution{font-size:9px}
    #error{display:none;position:absolute;inset:0;z-index:9999;align-items:center;justify-content:center;padding:24px;text-align:center;background:#eef5e8;color:#35523d;font-size:13px}
  </style>
</head>
<body>
  <div id="map"></div><div id="error">No fue posible cargar el mapa. Verifica la conexión a internet.</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data=${data};
    const showError=()=>{document.getElementById('error').style.display='flex'};
    const escapeHtml=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
    try {
      if(!window.L) throw new Error('Leaflet no disponible');
      const map=L.map('map',{zoomControl:true}).setView([data.region.latitude,data.region.longitude],${zoom});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      const markers={};
      data.stores.forEach((store)=>{
        const selected=store.id===data.selectedId;
        const marker=L.circleMarker([store.latitude,store.longitude],{
          radius:selected?11:9,color:'#fff',weight:3,fillColor:selected?'#0d4d28':'#218a46',fillOpacity:1
        }).addTo(map).bindPopup('<b>'+escapeHtml(store.name)+'</b><br>'+escapeHtml(store.address));
        marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'store',id:store.id})));
        markers[store.id]=marker;
      });
      if(data.userLocation){
        L.circleMarker([data.userLocation.latitude,data.userLocation.longitude],{radius:8,color:'#fff',weight:3,fillColor:'#2578c4',fillOpacity:1})
          .addTo(map).bindPopup('<b>Tu ubicación</b>');
      }
      if(markers[data.selectedId]) markers[data.selectedId].openPopup();
      setTimeout(()=>map.invalidateSize(),150);
    } catch(error) { showError(); }
  </script>
</body>
</html>`;
}

export default function StoreMap({ region, stores, selectedId, userLocation, onSelect }) {
  const html = useMemo(
    () => createMapHtml({ region, stores, selectedId, userLocation }),
    [region, stores, selectedId, userLocation],
  );

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'store') {
        const store = stores.find((item) => item.id === message.id);
        if (store) onSelect(store);
      }
    } catch {}
  };

  return (
    <View style={styles.frame}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#0D4D28" /><Text style={styles.loadingText}>Cargando mapa…</Text></View>}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === 'about:blank') return true;
          Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', height: 300, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E7EFE4' },
  webview: { flex: 1, backgroundColor: '#E7EFE4' },
  loading: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EFE4' },
  loadingText: { marginTop: 8, color: '#35523D', fontSize: 11, fontWeight: '700' },
});
