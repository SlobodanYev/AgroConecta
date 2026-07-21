# AgroConecta

## Descripción del proyecto

AgroConecta es una aplicación móvil orientada a apoyar a los pequeños agricultores de la ciudad de Arica y los valles de Azapa y Lluta. La plataforma aborda dos necesidades principales:

1. **Foro de asesoría técnica:** Los agricultores pueden publicar consultas agronómicas categorizadas (plagas, riego, nutrición, entre otras) y recibir orientación de otros miembros de la comunidad y de egresados de agronomía registrados en la plataforma.
2. **Mapa de tiendas de insumos agrícolas:** Permite localizar tiendas de insumos cercanas con marcadores interactivos y obtener la ruta hacia ellas a través de Google Maps.

Este repositorio corresponde al avance del **Sprint 1** para la asignatura Taller de Técnicas de Programación.

## Integrantes

| Nombre | Rol |
|---|---|
| Dylan Calderón | Desarrollador  |
| Benjamín Succso | Desarrollador |

## Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Lenguaje | JavaScript |
| Framework móvil | React Native con Expo |
| Autenticación | Firebase Authentication |
| Base de datos | Cloud Firestore |
| Mapa interactivo | react-native-maps |
| Ubicación GPS | expo-location |

## Funcionalidades del Sprint 1

- **HU-01 — Registro de usuario:** Permite crear una cuenta con nombre, correo, contraseña y rol (Agricultor o Egresado).
- **HU-02 — Inicio de sesión:** Autenticación con Firebase Auth. Incluye bloqueo temporal tras cinco intentos fallidos.
- **HU-04 — Crear consulta en el foro:** Formulario con título, descripción y categoría. Las publicaciones se sincronizan en tiempo real con Firestore.
- **HU-09 — Mapa de tiendas:** Muestra tiendas de insumos de Arica, Azapa y Lluta con marcadores. Permite centrar el mapa en la ubicación del usuario y abrir la ruta en Google Maps.

## Cómo ejecutar la aplicación

### Requisitos previos

- Node.js instalado.
- Aplicación **Expo Go** en un dispositivo Android (disponible en Google Play Store).

### Pasos

```powershell
cd mobile
npm install
npx expo start
```

Escanear el código QR que aparece en la consola con Expo Go. El dispositivo y el computador deben estar en la misma red Wi-Fi.

### Configuración de Firebase

El proyecto utiliza variables de entorno para conectarse a Firebase. Quien clone el repositorio debe:

1. Copiar `mobile/.env.example` como `mobile/.env`.
2. Completar los valores `EXPO_PUBLIC_FIREBASE_*` con las credenciales del proyecto Firebase.
3. Reiniciar Expo con `npx expo start --clear`.

### Cuenta de demostración

- Correo: `dylan@agroconecta.cl`
- Contraseña: `dylan2026`
