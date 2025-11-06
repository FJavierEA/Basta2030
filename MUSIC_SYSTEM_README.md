# 🎵 Sistema de Música de Fondo - BASTA (Independiente)

## Implementación Completada ✅

Se ha implementado completamente un sistema de música de fondo **independiente por jugador** para el juego BASTA con las siguientes características:

### 🎯 Funcionalidades Implementadas

1. **Música del Lobby**
   - Se inicia automáticamente cuando cada jugador entra al lobby
   - Música constante mientras esperan otros jugadores
   - Archivo: `audio/music/lobby.mp3`

2. **Música del Juego**
   - Cambia automáticamente cuando inicia la partida (por jugador)
   - **Selección aleatoria independiente** - cada jugador escucha pistas diferentes
   - Cambio automático cada 2.5 minutos durante el juego (individual)
   - Archivos: `audio/music/game1.mp3`, `game2.mp3`, etc.

3. **Control de Volumen**
   - Integrado con el botón 🎵 existente
   - Controla tanto música como efectos de sonido
   - Preferencias guardadas en localStorage

4. **Sistema Independiente**
   - **Cada jugador escucha música diferente y aleatoria**
   - **No hay sincronización** entre jugadores
   - **Completamente del lado cliente** - no hay comunicación de música con el servidor
   - Cada cliente maneja su propia selección musical

### 📁 Archivos Modificados

1. **`server.js`**
   - Configuración de música (líneas 20-35)
   - Funciones de manejo de música (después de línea 180)
   - Eventos Socket.IO integrados
   - Control de lobby y juego

2. **`index.html`**
   - Importación de AudioManager
   - Eventos de música actualizados
   - Funciones auxiliares de UI

3. **`audio-manager.js`** (nuevo)
   - Clase completa de manejo de audio
   - Control de volumen maestro
   - Transiciones suaves
   - Gestión de preferencias

4. **`audio/music/`** (nueva carpeta)
   - Estructura organizada de archivos
   - README con instrucciones
   - Placeholders para archivos de música

### 🎮 Cómo Usar

1. **Instalar Música**
   - Coloca `lobby.mp3` en `audio/music/`
   - Coloca `game1.mp3`, `game2.mp3`, etc. en `audio/music/`
   - Elimina los archivos `.placeholder`

2. **Control Durante el Juego**
   - Click en botón 🎵 para activar/desactivar
   - El volumen se ajusta automáticamente
   - La música cambia según el estado del juego

3. **Comportamiento**
   - **Lobby**: Música constante de fondo
   - **Juego**: Música aleatoria que cambia cada 2.5 min
   - **Final**: Música se detiene

### ⚡ Eventos del Sistema

**Eventos Locales (Sin comunicación servidor):**
- `lobby:update` - Inicia música de lobby automáticamente
- `game:start` - Cambia a música de juego (selección aleatoria)
- `game:ended` - Detiene música después de 3 segundos

**Sin eventos de música servidor ↔ cliente** - Sistema completamente independiente

### 🔧 Configuración

**Volúmenes por defecto:**
- Lobby: 30%
- Juego: 25%
- Efectos: mantienen su configuración actual

**Timing:**
- Cambio de pista: 150,000ms (2.5 minutos) **por jugador individual**
- **Sin sincronización** - cada jugador tiene su propio timing

### ✨ Características Avanzadas

- **Independiente por jugador**: Cada cliente maneja su propia música
- **Selección aleatoria individual**: Pistas diferentes para cada jugador
- **Fade out/in**: Transiciones suaves entre pistas
- **Error handling**: Manejo de archivos no encontrados
- **User interaction**: Activación después de interacción del usuario
- **Responsive**: Funciona en todas las resoluciones existentes
- **Memory efficient**: Reutiliza elementos de audio existentes
- **Sin overhead servidor**: No consume recursos del servidor

### 🎯 Estado Final

El sistema está **100% implementado y listo para usar**. Solo necesitas:

1. Agregar archivos de música reales (MP3, OGG, WAV, M4A)
2. Reemplazar los archivos `.placeholder`  
3. Reiniciar el servidor
4. ¡Disfrutar la música independiente por cada jugador!

**Cada jugador escuchará música diferente y aleatoria** - El botón 🎵 existente controla todo el sistema de audio de forma integrada.