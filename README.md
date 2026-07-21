# AgroConecta móvil - Expo SDK 56

Aplicación React Native con Expo y Firebase. El avance acumulado cubre los flujos principales del Product Backlog: autenticación, foro, respuestas, fotografías, perfiles de egresados, directorio, contacto, mapa y rutas.

## Ejecutar

```powershell
npm install
npx expo start
```

Escanea el QR con Expo Go en Android. La aplicación requiere un archivo `.env` configurado para utilizar Firebase Authentication y Firestore; no reemplaza esos servicios por almacenamiento local.

Usuario demo:

- Correo: `dylan@agroconecta.cl`
- Contraseña: `dylan2026`

## Conectar Firebase

1. Crea un proyecto en Firebase Console.
2. Activa Authentication > Correo electrónico/contraseña.
3. Crea una base Cloud Firestore.
4. Registra una aplicación web en Firebase.
5. Copia `.env.example` como `.env` y completa los valores `EXPO_PUBLIC_FIREBASE_*`.
6. Publica el contenido de `firestore.rules` en Firestore > Reglas.
7. Reinicia Expo con `npx expo start --clear`.

Para comprobar la conexión sin depender de la interfaz, ejecuta:

```powershell
npm run verify:firebase
```

La prueba reutiliza o crea la cuenta demo, comprueba el foro y confirma que Firestore rechaza una lectura anónima.

Para verificar las reglas sin modificar la base real, se puede usar el emulador:

```powershell
npx firebase-tools emulators:exec --only firestore --project demo-agroconecta "node scripts/test-firestore-rules.mjs"
```

Esta prueba comprueba privacidad, aprobación administrativa, identidad de autores y el máximo de tres fotografías.

La configuración pública de Firebase identifica el proyecto; la protección de datos depende de Authentication y de las reglas de Firestore. No se deben confirmar archivos `.env` ni claves privadas.

## Mapa

La vista interactiva utiliza Leaflet dentro de `react-native-webview`, con mosaicos de OpenStreetMap. Esto permite mostrar el mapa, los marcadores y la ubicación dentro de Expo Go sin activar facturación ni crear una clave de Google Cloud. La atribución **© OpenStreetMap contributors** permanece visible y enlaza a sus condiciones de uso.

El botón **Ver opciones de ruta** solicita la ubicación GPS y abre Google Maps con el origen y destino definidos. Allí el usuario elige si desea ir en auto, caminando u otro medio disponible y consulta la distancia y el tiempo estimado. Las Maps URLs no requieren una clave de API.

## Fotografías

HU-05 usa la cámara o galería del dispositivo y limita cada consulta a tres fotografías. Antes de enviarlas, la aplicación las comprime para mantener cada documento bajo el límite de Firestore. Cada imagen se guarda en `posts/{postId}/images`, por lo que puede verse desde otro dispositivo; no se guardan rutas locales del teléfono.

Esta solución evita depender de Cloud Storage durante el prototipo académico. Para una aplicación de producción con muchas imágenes se recomienda utilizar un servicio de almacenamiento de archivos.

Las fotografías se muestran completas en un visor, pero se redimensionan y comprimen antes de guardarse. Esta decisión prioriza la velocidad y el límite por documento de Firestore; por ello no se debe describir esta versión como conservación de la resolución original.

## Validación de egresados

1. Un egresado completa su RUT y sus antecedentes profesionales desde **Perfil** y los envía.
2. Su documento privado queda con estado `pending` y no aparece en el directorio.
   Mientras está pendiente, el formulario queda bloqueado para evitar envíos repetidos.
3. Una cuenta con rol `Administrador` revisa la solicitud desde **Perfil** y la aprueba o rechaza.
4. Al aprobar, se crea una ficha en `graduateProfiles` con solo datos públicos de contacto; el RUT y el folio permanecen privados.
5. Si el egresado modifica la información, la ficha pública se retira hasta una nueva aprobación.

La cuenta administradora no se puede crear desde la aplicación. Para la demostración, crea una cuenta normal y cambia manualmente su campo `role` a `Administrador` desde Firebase Console. La revisión implementada es manual; no consulta automáticamente un registro institucional externo.
