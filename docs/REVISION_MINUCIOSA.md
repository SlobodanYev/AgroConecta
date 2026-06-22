# Revisión minuciosa y plan de Evaluación 3

## 1. Material revisado

Se revisaron 18 PDF. Dos pares son copias idénticas según su contenido:

- `TTP Semana 01-1-1.pdf` y `TTP Semana 01-1.pdf`.
- `TTP Semana 05-2-1.pdf` y `TTP Semana 05-2-2.pdf`.

El análisis efectivo cubre, por tanto, 16 documentos únicos: pautas de las evaluaciones 1, 2 y 3; informes 1 y 2; y clases sobre proyecto, stakeholders, alcance, IEEE-830, ciclos de vida, Scrum, historias de usuario, Planning Poker, prototipado y Git.

## 2. Continuidad entre evaluaciones

### Evaluación 1

La pauta exigía stakeholders, ERS bajo IEEE-830 y alcance con inclusiones y exclusiones. El Informe 1 cubre esas tres partes y define diez requisitos funcionales. El proyecto se acota correctamente: no incluye comercio electrónico, pagos, hardware agrícola ni aplicación de escritorio.

Fortalezas que explican la nota 6,5:

- Estructura completa y trazable.
- Requisitos identificados del RF-01 al RF-10.
- Alcance y exclusiones explícitos.
- Uso de métricas en rendimiento y calidad.

Aspectos que deben mantenerse consistentes:

- Android, Firebase y Google Maps aparecen como arquitectura proyectada.
- El núcleo declarado es registro/autenticación, foro y mapa.

### Evaluación 2

La pauta exigía historias de usuario, criterios de aceptación, evidencia de Planning Poker, Product/Sprint Backlog y prototipos. El Informe 2 traduce los diez RF a diez HU y selecciona cuatro para el Sprint 1:

| HU | Funcionalidad | Puntos |
|---|---|---:|
| HU-01 | Registro con rol | 5 |
| HU-02 | Inicio de sesión | 5 |
| HU-04 | Crear consultas categorizadas | 40 |
| HU-09 | Mapa interactivo de tiendas | 40 |
| | Total Sprint 1 | 90 |

Riesgos e inconsistencias detectadas:

- La velocidad de 90 puntos se definió sin historial previo y sobre tres líneas paralelas; dejó de ser realista al reducirse el equipo a dos integrantes.
- El texto final afirma que se diseñaron cinco pantallas, aunque el índice presenta cuatro wireframes y cuatro mockups.
- Login/registro se mencionan en la trazabilidad, pero no aparecen como pantallas desarrolladas en las páginas de prototipos de alto nivel.
- El foro y el mapa recibieron 40 puntos cada uno por incertidumbre técnica; no conviene fingir que están terminados si faltan backend, GPS o pruebas.

### Evaluación 3

No solicita un informe nuevo. Exige:

1. Incremento de software del Sprint 1 con aproximadamente 70% de avance.
2. Repositorio Git público.
3. Profesor invitado como colaborador: `lalarconb@gestion.uta.cl`.
4. Presentación con introducción, Planning Poker, planificación versus realidad y demo.
5. PDF de diapositivas y TXT con el enlace directo al repositorio.
6. Entrega el martes 23 de junio de 2026 antes del inicio de clases.

## 3. Estrategia aplicada

La estrategia inicial de contingencia fue reemplazada por una aplicación React Native con Expo SDK 56, respetando el stack informado en Telegram. El prototipo inicial fue retirado del repositorio para evitar ambigüedades. La implementación móvil compila para Android y está conectada al proyecto Firebase del equipo mediante variables de entorno locales ignoradas por Git. Firebase Authentication, Cloud Firestore, `react-native-webview`, Leaflet, OpenStreetMap y `expo-location` forman parte del incremento.

La integración real se comprobó de extremo a extremo: creación o reutilización de la cuenta demo, escritura del perfil, publicación de una consulta, lectura autenticada y rechazo de una lectura anónima por las reglas de Firestore. El mapa sigue pendiente de prueba física en Android y medición de carga.

Se cerraron tres historias de extremo a extremo:

- HU-01: formulario, rol, validación de campos, contraseña mínima y correo no duplicado.
- HU-02: acceso, error genérico, sesión persistente y bloqueo temporal después de cinco intentos.
- HU-04: título, descripción, categoría, publicación inmediata y visualización en el foro.

HU-09 se entrega como avance funcional:

- Mapa interactivo mediante Leaflet dentro de `react-native-webview`, con mosaicos OpenStreetMap, sin claves ni facturación externa.
- Tres tiendas con nombre y dirección.
- Selección de tienda y centrado del mapa.
- Solicitud de geolocalización implementada.
- La ubicación se solicita mediante `expo-location` y se centra el mapa cuando el usuario concede el permiso.
- Apertura de Google Maps con la tienda seleccionada como destino para calcular la ruta actualizada.

La capa cartográfica se cambió a Leaflet/OpenStreetMap después de comprobar en dos dispositivos que los mosaicos incluidos por Google en Expo Go aparecían negros. La decisión conserva los criterios funcionales de HU-09 —mapa interactivo, marcadores, ficha y GPS— y mantiene Google Maps para la navegación externa, evitando exigir una cuenta de facturación para la demostración académica.

La exposición mostrará dos métricas para evitar una afirmación engañosa:

- Historias completas: 3 de 4 = 75%.
- Puntos completamente cerrados: 50 de 90 = 55,6%.

HU-09 se presenta aparte como avance funcional y no se suma artificialmente como historia cerrada.

## 4. Plan de trabajo para dos integrantes

### Sábado 20 de junio

- Construir el incremento funcional.
- Crear pruebas de humo.
- Preparar repositorio Git local con commits atómicos.
- Crear PPTX, PDF y guion.

### Domingo 21 de junio

- Publicar el repositorio en GitHub.
- Reemplazar el contenido de `Enlace_repositorio.txt` por la URL real.
- Invitar al profesor como colaborador.
- Probar la demo en el computador que se usará en clases.

### Lunes 22 de junio

- Ensayar dos veces con cronómetro.
- Asignar quién habla y quién controla la demo.
- Preparar plan de contingencia: cuenta demo, navegador abierto y copia local.
- Verificar PDF y TXT definitivos.

### Martes 23 de junio

- Subir PDF y TXT antes del inicio de clases.
- Abrir la aplicación y el repositorio antes de presentar.
- Ejecutar la demo sin detenerse en detalles de código.

## 5. Distribución durante la presentación

- Integrante A: problema, objetivo, Planning Poker y cambio de capacidad.
- Integrante B: estado real, arquitectura y demostración.
- Ambos: preguntas sobre Git, seguridad y siguientes pasos.

## 6. Pendiente externo

El repositorio local y su historial ya están creados. Para completar la entrega falta una acción vinculada a la cuenta del equipo: crear/publicar el repositorio remoto, copiar su URL al TXT e invitar al profesor. No se debe entregar el TXT mientras mantenga la palabra `PENDIENTE`.
