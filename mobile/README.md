# AgroConecta móvil - Expo SDK 56

Aplicación React Native con Expo para las cuatro historias del Sprint 1:

- HU-01: registro con rol.
- HU-02: inicio de sesión y bloqueo temporal tras cinco intentos fallidos.
- HU-04: creación y listado de consultas en tiempo real.
- HU-09: mapa interactivo con marcadores de tiendas y ubicación del dispositivo.

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
6. Publica las reglas de `firestore.rules`.
7. Reinicia Expo con `npx expo start --clear`.

Para comprobar la conexión sin depender de la interfaz, ejecuta:

```powershell
npm run verify:firebase
```

La prueba crea o reutiliza la cuenta demo, actualiza su perfil, publica una consulta y confirma que Firestore rechaza una lectura anónima.

La configuración pública de Firebase identifica el proyecto; la protección de datos depende de Authentication y de las reglas de Firestore. No se deben confirmar archivos `.env` ni claves privadas.

## Mapa

La vista interactiva utiliza Leaflet dentro de `react-native-webview`, con mosaicos de OpenStreetMap. Esto permite mostrar el mapa, los marcadores y la ubicación dentro de Expo Go sin activar facturación ni crear una clave de Google Cloud. La atribución **© OpenStreetMap contributors** permanece visible y enlaza a sus condiciones de uso.

El botón **Cómo llegar** abre Google Maps con la tienda seleccionada como destino y solicita el cálculo actualizado de la ruta en automóvil.
