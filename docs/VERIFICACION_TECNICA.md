# Verificación técnica del incremento

Fecha de verificación: 21 de junio de 2026.

## Resultado

| Componente | Prueba | Resultado |
|---|---|---|
| Dependencias Expo | `npx expo-doctor@latest` | 21/21 comprobaciones aprobadas |
| Aplicación web | Exportación de producción con Expo | Correcta |
| Aplicación Android | Generación del bundle con Expo | Correcta |
| Recorrido funcional web | Inicio de sesión, foro, búsqueda, validación, selección de tienda y perfil | Correcto |
| Interfaz móvil | Lenguaje claro, textos legibles, controles accesibles y navegación coherente | Correcta |
| Firebase Authentication | Crear o reutilizar cuenta demo e iniciar sesión | Correcta |
| Cloud Firestore | Crear perfil y publicar una consulta | Correcta |
| Reglas Firestore | Lectura autenticada | Permitida |
| Reglas Firestore | Lectura anónima | Rechazada |

## Prueba reproducible de Firebase

Con `mobile/.env` configurado:

```powershell
cd mobile
npm install
npm run verify:firebase
```

El script `mobile/scripts/verify-firebase.mjs` utiliza únicamente la API pública del proyecto. No emplea claves administrativas. Comprueba el flujo de usuario real y termina con el mensaje `VERIFICACIÓN FIREBASE COMPLETA` si todos los controles pasan.

Cuenta preparada para la demostración:

- Correo: `dylan@agroconecta.cl`
- Contraseña: `dylan2026`
- Nombre: `Dylan`
- Rol: `Agricultor`

## Pruebas manuales en Android

- Mapa, mosaicos, marcadores y ficha comprobados en un Android físico.
- **Cómo llegar** comprobado: Google Maps recibe origen y destino.

## Pendiente antes de presentar

- Conceder el permiso de ubicación y confirmar el centrado por GPS.
- Seleccionar las tres tiendas y comprobar sus fichas individualmente.
- Medir que el mapa cargue en menos de tres segundos.
- Ensayar el recorrido completo con la cuenta demo.
