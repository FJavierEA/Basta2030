# Sistema de Música del Juego BASTA 🎵 (Independiente por Jugador)

## Estructura de archivos:

### Música del Lobby:
- `lobby.mp3` - Música que se reproduce en el lobby mientras los jugadores esperan

### Música del Juego:
- `game1.mp3` - Música de fondo durante la partida
- `game2.mp3` - Música de fondo durante la partida  
- `game3.mp3` - Música de fondo durante la partida
- `game4.mp3` - Música de fondo durante la partida
- (Agregar más archivos game5.mp3, game6.mp3, etc. según necesidades)

## Instrucciones de instalación:

1. **Reemplaza los archivos .placeholder con archivos de música reales**
   - Elimina los archivos `.placeholder`
   - Coloca tus archivos de música con los nombres exactos (lobby.mp3, game1.mp3, etc.)

2. **Formatos soportados:** MP3, OGG, WAV, M4A
3. **Para el lobby:** Un solo archivo llamado `lobby.mp3`
4. **Para el juego:** Múltiples archivos con nombres `game1.mp3`, `game2.mp3`, etc.

## Características del sistema:

### ✅ Funciones implementadas:
- 🎵 **Música independiente** - cada jugador escucha música diferente
- 🎲 **Selección aleatoria individual** - cada cliente elige sus pistas aleatoriamente
- 🔄 **Cambio automático** cada 2.5 minutos durante el juego (por jugador)
- 🔊 **Control de volumen** integrado con el botón existente
- 🎮 **Transiciones suaves** entre lobby y juego
- 💾 **Preferencias guardadas** en localStorage

### 🎛️ Controles:
- **Botón 🎵**: Activa/desactiva toda la música y efectos
- **Volumen automático**: 30% lobby, 25% juego
- **Loop continuo**: La música se repite automáticamente
- **Sin sincronización**: Cada jugador escucha pistas diferentes

### 🔧 Configuración local:
- Todo configurado en `audio-manager.js`
- **NO hay eventos del servidor** - completamente del lado cliente
- Cambio de pista cada 150,000ms (2.5 minutos) por jugador
- Selección aleatoria independiente para cada cliente

### 📁 Archivos modificados:
- ✅ `index.html` - Eventos locales del juego
- ✅ `audio-manager.js` - Sistema completo independiente
- ✅ Estructura de carpetas `audio/music/`
- ❌ `server.js` - NO contiene lógica de música (removida)

## Notas técnicas:
- **Completamente independiente**: Cada jugador tiene su propia música
- **Sin sincronización**: Los jugadores no escuchan lo mismo
- **Selección aleatoria**: Cada cliente elige pistas diferentes
- La música se inicia al unirse al lobby (por jugador)
- Cambia automáticamente cuando comienza el juego (por jugador)
- Se detiene cuando termina la partida
- Compatible con el sistema de control de volumen existente
- **No hay comunicación de música entre servidor y clientes**