/**
 * AudioManager - Sistema de manejo de audio para BASTA (Independiente por jugador)
 * Maneja música de fondo, efectos de sonido y controles de volumen de forma local
 */
class AudioManager {
  constructor() {
    this.sounds = {
      background: null,
      music: null,
      bell: null,
      card: null,
      chatNotify: null,
      panel: null
    };
    
    this.music = {
      current: null,
      isPlaying: false,
      volume: 0.3,
      mode: 'lobby', // 'lobby' | 'game'
      changeTimer: null,
      trackIndex: 0,
      // Sistema de música silenciosa (continúa progresando aunque esté muted)
      silentMode: false,
      silentStartTime: null,
      silentModeTimer: null,
      // Control de ciclo único
      currentTrackFinished: false,
      waitingForNextCycle: false
    };
    
    // Configuración local de música
    this.musicConfig = {
      lobby: {
        track: '/audio/lobby.mp3', // Música de lobby en carpeta audio raíz
        loop: true,
        volume: 0.3
      },
      game: {
        tracks: [
          '/audio/music/game1.mp3',
          '/audio/music/game2.mp3', 
          '/audio/music/game3.mp3',
          '/audio/music/game4.mp3',
          '/audio/music/game5.mp3',
          '/audio/music/game6.mp3',
          '/audio/music/game7.mp3',
          '/audio/music/game8.mp3',
          '/audio/music/game9.mp3',
          '/audio/music/game10.mp3',
          '/audio/music/game11.mp3',
          '/audio/music/game12.mp3',
          '/audio/music/game13.mp3',
          '/audio/music/game14.mp3'
        ],
        loop: false, // Cada canción se reproduce solo una vez
        volume: 0.25,
        changeInterval: 240000 // 4 minutos en ms
      }
    };
    
    // Sistema de volúmenes separados
    this.volumes = {
      master: 1.0,    // Volumen general
      music: 0.7,     // Volumen específico de música
      fx: 0.8,        // Volumen de efectos
      voice: 1.0      // Volumen de voz
    };
    
    this.soundEnabled = true;
    this.musicEnabled = true;
    
    this.initializeAudio();
    
    // Inicializar música automáticamente al cargar
    setTimeout(() => {
      this.autoStartMusic();
    }, 1000);
  }
  
  initializeAudio() {
    // Inicializar elementos de audio existentes
    this.sounds.background = document.getElementById('bgMusic');
    this.sounds.bell = document.getElementById('bellSound');
    this.sounds.card = document.getElementById('cardMoveSound');
    this.sounds.chatNotify = document.getElementById('chatNotifySound');
    this.sounds.panel = document.getElementById('panelSound');
    
    // Crear elemento para música dinámica
    this.sounds.music = document.createElement('audio');
    this.sounds.music.loop = false; // Sin loop - reproducir una sola vez
    this.sounds.music.preload = 'auto';
    document.body.appendChild(this.sounds.music);
    
    // Agregar listener para detectar cuando termina una canción
    this.sounds.music.addEventListener('ended', () => {
      this.onTrackEnded();
    });
    
    // Configurar volúmenes iniciales
    if (this.sounds.background) this.sounds.background.volume = 0.3;
    if (this.sounds.bell) this.sounds.bell.volume = 0.7;
    if (this.sounds.card) this.sounds.card.volume = 0.4;
    if (this.sounds.chatNotify) this.sounds.chatNotify.volume = 0.5;
    if (this.sounds.panel) this.sounds.panel.volume = 0.6;
    this.sounds.music.volume = this.music.volume;
    
    // Restaurar preferencias de localStorage
    this.loadPreferences();
  }

  // Método llamado cuando termina una canción
  onTrackEnded() {
    console.log('🎵 Canción terminada:', this.music.current);
    
    if (this.music.mode === 'game') {
      // Marcar que la canción actual terminó
      this.music.currentTrackFinished = true;
      this.music.waitingForNextCycle = true;
      this.music.isPlaying = false;
      
      console.log('🔇 Esperando siguiente ciclo de música...');
    } else if (this.music.mode === 'lobby') {
      // La música de lobby sí debe hacer loop, pero solo si estamos realmente en el lobby
      // Verificar que no hayamos cambiado de contexto sin actualizar el modo
      const lobbyOverlay = document.getElementById('lobbyOverlay');
      const isStillInLobby = lobbyOverlay && !lobbyOverlay.classList.contains('hidden');
      
      if (isStillInLobby) {
        console.log('🔄 Reiniciando música de lobby...');
        this.sounds.music.currentTime = 0;
        this.sounds.music.play();
      } else {
        // Ya no estamos en lobby, cambiar a modo juego
        console.log('🎮 Contexto cambió a juego, actualizando modo...');
        this.forceGameMode();
      }
    }
  }
  
  loadPreferences() {
    const soundPref = localStorage.getItem('soundEnabled');
    const musicPref = localStorage.getItem('musicEnabled');
    
    if (soundPref !== null) {
      this.soundEnabled = soundPref === 'true';
    }
    
    if (musicPref !== null) {
      this.musicEnabled = musicPref === 'true';
    }
  }
  
  savePreferences() {
    localStorage.setItem('soundEnabled', this.soundEnabled.toString());
    localStorage.setItem('musicEnabled', this.musicEnabled.toString());
  }
  
  // Control de música de fondo independiente
  startLobbyMusic() {
    console.log('🎵 startLobbyMusic() llamado');
    console.log('🎵 musicEnabled:', this.musicEnabled);
    
    if (!this.musicEnabled) {
      console.log('🎵 Música deshabilitada, no iniciando');
      return;
    }

    this.music.mode = 'lobby';
    this.music.volume = this.musicConfig.lobby.volume;
    
    // Si ya hay música sonando y es diferente, hacer transición suave
    if (this.music.isPlaying && this.music.current !== this.musicConfig.lobby.track) {
      console.log('🎵 Cambiando a música de lobby con transición suave...');
      const targetVolume = this.volumes.master * this.volumes.music * this.music.volume;
      
      this.fadeToNewMusic(this.musicConfig.lobby.track, targetVolume).then(() => {
        this.music.current = this.musicConfig.lobby.track;
        this.sounds.music.loop = this.musicConfig.lobby.loop; // Loop true para lobby
        this.music.currentTrackFinished = false;
        this.music.waitingForNextCycle = false;
        console.log(`✅ Música de lobby iniciada con transición suave: ${this.musicConfig.lobby.track}`);
      });
      return;
    }
    
    // Si no hay música o es la misma, proceder normalmente
    this.stopMusic();
    
    console.log('🎵 Configurando música de lobby:', this.musicConfig.lobby.track);
    this.sounds.music.src = this.musicConfig.lobby.track;
    this.sounds.music.loop = this.musicConfig.lobby.loop; // Loop true para lobby
    this.music.currentTrackFinished = false;
    this.music.waitingForNextCycle = false;
    this.updateAllVolumes(); // Aplicar volúmenes actuales
    
    console.log('🎵 Intentando reproducir música de lobby...');
    this.sounds.music.play().then(() => {
      this.music.current = this.musicConfig.lobby.track;
      this.music.isPlaying = true;
      console.log(`✅ Música de lobby iniciada: ${this.musicConfig.lobby.track}`);
    }).catch(error => {
      console.warn('❌ Error al reproducir música de lobby (probablemente autoplay bloqueado):', error);
      console.log('🎵 La música se iniciará después de la primera interacción del usuario');
      // Intentar reproducir después de interacción del usuario
      this.pendingMusic = { type: 'lobby' };
      
      // Agregar listener para primera interacción
      this.addFirstInteractionListener();
    });
  }

  // Forzar cambio a modo juego (usado cuando inicia partida aunque esté silenciado)
  forceGameMode() {
    console.log('🎮 Forzando cambio a modo juego...');
    console.log('📊 Estado previo - Modo:', this.music.mode, 'Timer activo:', !!this.music.changeTimer);
    
    // Detener cualquier loop de lobby
    if (this.sounds.music) {
      this.sounds.music.loop = false;
      console.log('🔄 Loop de lobby desactivado');
    }
    
    // Limpiar timer existente si hay uno
    if (this.music.changeTimer) {
      clearInterval(this.music.changeTimer);
      this.music.changeTimer = null;
      console.log('⏹️ Timer previo limpiado');
    }
    
    // Cambiar modo y resetear estados
    this.music.mode = 'game';
    this.music.currentTrackFinished = false;
    this.music.waitingForNextCycle = false;
    
    // Iniciar timer de juego
    this.startGameMusicTimer();
    
    console.log('✅ Modo cambiado a juego. Timer activo:', !!this.music.changeTimer);
  }
  
  startGameMusic() {
    if (!this.musicEnabled) return;
    
    this.music.mode = 'game';
    this.music.volume = this.musicConfig.game.volume;
    
    // Seleccionar pista aleatoria
    this.music.trackIndex = Math.floor(Math.random() * this.musicConfig.game.tracks.length);
    const selectedTrack = this.musicConfig.game.tracks[this.music.trackIndex];
    
    // Si ya hay música sonando, hacer transición suave
    if (this.music.isPlaying) {
      console.log('🎵 Cambiando a música de juego con transición suave...');
      const targetVolume = this.volumes.master * this.volumes.music * this.music.volume;
      
      this.fadeToNewMusic(selectedTrack, targetVolume).then(() => {
        this.music.current = selectedTrack;
        this.sounds.music.loop = this.musicConfig.game.loop;
        this.music.currentTrackFinished = false; // Reset estado
        this.music.waitingForNextCycle = false;
        console.log(`🎵 Música de juego iniciada con transición suave: ${selectedTrack}`);
        
        // Configurar cambio automático de música
        this.startGameMusicTimer();
      });
      return;
    }
    
    // Si no hay música, proceder normalmente
    this.stopMusic();
    
    this.sounds.music.src = selectedTrack;
    this.sounds.music.loop = this.musicConfig.game.loop;
    this.music.currentTrackFinished = false; // Reset estado
    this.music.waitingForNextCycle = false;
    this.updateAllVolumes(); // Aplicar volúmenes actuales
    
    this.sounds.music.play().then(() => {
      this.music.current = selectedTrack;
      this.music.isPlaying = true;
      console.log(`🎵 Iniciando música de juego: ${selectedTrack}`);
      
      // Configurar cambio automático de música
      this.startGameMusicTimer();
    }).catch(error => {
      console.warn('Error al reproducir música de juego:', error);
      // Intentar reproducir después de interacción del usuario
      this.pendingMusic = { type: 'game' };
    });
  }
  
  startGameMusicTimer() {
    if (this.music.changeTimer) {
      clearInterval(this.music.changeTimer);
    }
    
    this.music.changeTimer = setInterval(() => {
      console.log('🕒 Timer ejecutado - Modo actual:', this.music.mode, '- Silent mode:', this.music.silentMode);
      if (this.music.mode === 'game') {
        console.log('🕒 Timer de cambio activado, iniciando nuevo ciclo...');
        this.changeGameTrack();
      } else {
        console.log('⚠️ Timer no ejecutó cambio - modo incorrecto:', this.music.mode);
      }
    }, this.musicConfig.game.changeInterval);
  }
  
  changeGameTrack() {
    if (this.music.mode !== 'game') {
      console.log('⚠️ changeGameTrack cancelado - no estamos en modo juego:', this.music.mode);
      return;
    }
    
    console.log('🎲 Seleccionando nueva canción de juego...');
    console.log('📊 Índice actual:', this.music.trackIndex);
    console.log('📊 Total de canciones disponibles:', this.musicConfig.game.tracks.length);
    
    // Seleccionar una pista diferente aleatoriamente
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.musicConfig.game.tracks.length);
    } while (newIndex === this.music.trackIndex && this.musicConfig.game.tracks.length > 1);
    
    this.music.trackIndex = newIndex;
    const newTrack = this.musicConfig.game.tracks[newIndex];
    
    console.log('🎵 Nueva canción seleccionada:', newTrack, '(índice:', newIndex, ')');
    
    // Reset del estado para la nueva canción
    this.music.currentTrackFinished = false;
    this.music.waitingForNextCycle = false;
    
    if (this.music.silentMode) {
      // En modo silencioso, solo actualizar el estado interno
      console.log(`🔇 Cambio silencioso de música: ${newTrack} (índice: ${newIndex})`);
      this.music.current = newTrack;
    } else {
      // En modo normal, hacer la transición con audio
      console.log(`🎵 Iniciando nuevo ciclo de música: ${newTrack}`);
      const targetVolume = this.volumes.master * this.volumes.music * this.musicConfig.game.volume;
      this.fadeToNewMusic(newTrack, targetVolume, 2000).then(() => {
        this.music.current = newTrack;
        this.sounds.music.loop = this.musicConfig.game.loop;
        this.music.isPlaying = true; // Marcar como reproduciendo
        console.log(`🎵 Cambiando música de juego: ${newTrack}`);
      });
    }
  }
  
  stopMusic() {
    if (this.sounds.music) {
      this.sounds.music.pause();
      this.sounds.music.currentTime = 0;
      this.music.isPlaying = false;
      this.music.current = null;
    }
    
    // Solo limpiar timer si NO estamos en modo silencioso
    // En modo silencioso, el timer debe seguir corriendo
    if (this.music.changeTimer && !this.music.silentMode) {
      clearInterval(this.music.changeTimer);
      this.music.changeTimer = null;
    }
  }

  // Detener música completamente (usado al terminar juego)
  forceStopMusic() {
    if (this.sounds.music) {
      this.sounds.music.pause();
      this.sounds.music.currentTime = 0;
      this.music.isPlaying = false;
      this.music.current = null;
    }
    
    // Limpiar timer siempre
    if (this.music.changeTimer) {
      clearInterval(this.music.changeTimer);
      this.music.changeTimer = null;
    }
    
    // Salir del modo silencioso
    this.music.silentMode = false;
    this.music.silentStartTime = null;
  }
  
  // Efectos de sonido
  playSound(soundName, volume = null) {
    if (!this.soundEnabled) return;
    
    const sound = this.sounds[soundName];
    if (!sound) return;
    
    try {
      sound.currentTime = 0;
      if (volume !== null) {
        const originalVolume = sound.volume;
        sound.volume = volume;
        sound.addEventListener('ended', () => {
          sound.volume = originalVolume;
        }, { once: true });
      }
      sound.play().catch(error => {
        console.warn(`Error reproduciendo sonido ${soundName}:`, error);
      });
    } catch (error) {
      console.warn(`Error con sonido ${soundName}:`, error);
    }
  }
  
  // Control de volumen maestro
  setMasterVolume(enabled) {
    console.log('🎵 setMasterVolume llamado con:', enabled);
    this.soundEnabled = enabled;
    this.musicEnabled = enabled;
    
    if (!enabled) {
      console.log('🎵 Entrando en modo silencioso');
      this.enterSilentMode();
      // Pausar música de fondo existente
      if (this.sounds.background && !this.sounds.background.paused) {
        this.sounds.background.pause();
      }
    } else {
      console.log('🎵 Saliendo de modo silencioso');
      this.exitSilentMode();
    }
    
    this.savePreferences();
  }

  // Sistema de música silenciosa - continúa progresando aunque esté muted
  enterSilentMode() {
    if (this.music.silentMode) return; // Ya está en modo silencioso
    
    console.log('🔇 Entrando en modo silencioso - la música seguirá progresando internamente');
    this.music.silentMode = true;
    this.music.silentStartTime = Date.now();
    
    // Solo silenciar el audio, no detener la lógica de música
    if (this.sounds.music && !this.sounds.music.paused) {
      this.sounds.music.volume = 0; // Silenciar en lugar de pausar
    }
    
    // Mantener el timer de cambio de música corriendo si estamos en modo juego
    if (this.music.mode === 'game') {
      console.log('🔇 Manteniendo timer de cambio de música en modo silencioso');
      // El timer ya está corriendo, solo necesitamos asegurar que continúe
    }
  }

  exitSilentMode() {
    if (!this.music.silentMode) {
      // No estaba en modo silencioso
      console.log('🎵 No estaba en modo silencioso. Estado actual:', {
        isPlaying: this.music.isPlaying,
        mode: this.music.mode,
        current: this.music.current
      });
      
      // Solo intervenir si no hay música reproduciéndose o si hay música pendiente
      if (this.pendingMusic) {
        console.log('🎵 Hay música pendiente:', this.pendingMusic);
        if (this.pendingMusic.type === 'lobby') {
          this.startLobbyMusic();
        } else if (this.pendingMusic.type === 'game') {
          this.startGameMusic();
        }
        this.pendingMusic = null;
      } else if (!this.music.isPlaying || !this.music.current) {
        console.log('🎵 No hay música reproduciéndose, verificando contexto');
        this.resumeAppropriateMusic();
      } else {
        console.log('🎵 Ya hay música reproduciéndose, solo restaurando volumen');
        this.updateAllVolumes();
      }
      return;
    }
    
    console.log('🔊 Saliendo de modo silencioso');
    const silentDuration = Date.now() - this.music.silentStartTime;
    console.log(`🔊 Estuvo silenciado por ${Math.round(silentDuration / 1000)} segundos`);
    
    this.music.silentMode = false;
    this.music.silentStartTime = null;
    
    // Verificar contexto actual antes de decidir qué música iniciar
    const lobbyOverlay = document.getElementById('lobbyOverlay');
    const isInLobby = lobbyOverlay && !lobbyOverlay.classList.contains('hidden');
    
    console.log('🔊 Verificando contexto - En lobby:', isInLobby, 'Modo actual:', this.music.mode);
    
    // Si estamos en juego pero el modo era lobby, forzar cambio
    let modeChanged = false;
    const currentTrackIsLobby = this.music.current && this.music.current.includes('lobby.mp3');
    
    if (!isInLobby && (this.music.mode === 'lobby' || currentTrackIsLobby)) {
      console.log('🔊 Detectado cambio de contexto: lobby → juego');
      console.log('🔊 Música actual es de lobby:', currentTrackIsLobby);
      this.forceGameMode();
      modeChanged = true;
    }
    
    // Si estamos en modo juego, calcular cuántos cambios de música deberían haber ocurrido
    if (this.music.mode === 'game') {
      const changeInterval = this.musicConfig.game.changeInterval;
      const missedChanges = Math.floor(silentDuration / changeInterval);
      
      console.log(`🔊 Durante el silencio deberían haber ocurrido ${missedChanges} cambios de música`);
      
      if (missedChanges > 0 || modeChanged) {
        // Si cambió el modo o hubo cambios perdidos, iniciar nueva música
        if (missedChanges > 0) {
          // Avanzar el índice de pista según los cambios que se perdieron
          for (let i = 0; i < missedChanges; i++) {
            this.music.trackIndex = (this.music.trackIndex + 1) % this.musicConfig.game.tracks.length;
          }
          console.log(`🔊 Nuevo índice de pista: ${this.music.trackIndex}`);
        }
        
        // Iniciar la música correspondiente al tiempo actual
        const newTrack = this.musicConfig.game.tracks[this.music.trackIndex];
        console.log('🔊 Iniciando música de juego:', newTrack);
        this.startSpecificGameMusic(newTrack);
      } else {
        // Restaurar el volumen de la música actual si no había terminado
        if (!this.music.currentTrackFinished) {
          console.log('🔊 Restaurando volumen de canción actual de juego');
          this.updateAllVolumes();
        } else {
          console.log('🔊 La canción había terminado, iniciando nueva canción de juego');
          const newTrack = this.musicConfig.game.tracks[this.music.trackIndex];
          this.startSpecificGameMusic(newTrack);
        }
      }
    } else if (isInLobby) {
      // Solo en modo lobby si realmente estamos en el lobby
      console.log('🔊 Restaurando música de lobby');
      this.sounds.music.loop = true;
      this.updateAllVolumes();
    }
  }

  // Método para iniciar una pista específica de juego (usado al salir del modo silencioso)
  startSpecificGameMusic(trackSrc) {
    console.log('🎵 Iniciando pista específica de juego:', trackSrc);
    
    if (this.sounds.music) {
      const targetVolume = this.volumes.master * this.volumes.music * this.musicConfig.game.volume;
      
      this.fadeToNewMusic(trackSrc, targetVolume, 1000).then(() => {
        this.music.current = trackSrc;
        this.music.isPlaying = true;
        this.sounds.music.loop = this.musicConfig.game.loop;
        console.log(`✅ Pista específica de juego iniciada: ${trackSrc}`);
      });
    }
  }
  
  // Activar música después de interacción del usuario
  enableUserInteraction() {
    if (this.pendingMusic && this.musicEnabled) {
      if (this.pendingMusic.type === 'lobby') {
        this.startLobbyMusic();
      } else if (this.pendingMusic.type === 'game') {
        this.startGameMusic();
      }
      this.pendingMusic = null;
    }
  }
  
  // Reanudar música apropiada según el contexto del juego
  resumeAppropriateMusic() {
    if (!this.musicEnabled) return;
    
    // Verificar si estamos en un juego activo o en el lobby
    // Usar múltiples indicadores para determinar el contexto
    const lobbyOverlay = document.getElementById('lobbyOverlay');
    const gameBoard = document.getElementById('gameBoard');
    const playerCards = document.getElementById('playerCards');
    const gameInterface = document.querySelector('.game-interface, .panel-info, .main-area');
    const isInGame = window.gameState && window.gameState.gameStatus === 'playing';
    
    console.log('🎵 Detectando contexto del juego:');
    console.log('  - lobbyOverlay hidden:', lobbyOverlay && lobbyOverlay.classList.contains('hidden'));
    console.log('  - gameBoard visible:', gameBoard && gameBoard.style.display !== 'none');
    console.log('  - playerCards visible:', playerCards && playerCards.style.display !== 'none');
    console.log('  - gameInterface visible:', gameInterface && gameInterface.style.display !== 'none');
    console.log('  - gameState.gameStatus:', window.gameState?.gameStatus);
    console.log('  - Modo actual del AudioManager:', this.music.mode);
    console.log('  - Música actual:', this.music.current);
    
    // Si el AudioManager ya está en modo juego, respetarlo
    if (this.music.mode === 'game') {
      console.log('🎵 AudioManager ya está en modo juego - Resumiendo música de juego');
      this.startGameMusic();
      return;
    }
    
    // Lógica más precisa para determinar el contexto
    const isLobbyVisible = lobbyOverlay && !lobbyOverlay.classList.contains('hidden');
    const isGameVisible = (gameBoard && gameBoard.style.display !== 'none') ||
                         (playerCards && playerCards.style.display !== 'none') ||
                         (gameInterface && gameInterface.style.display !== 'none');
    
    // Verificar si la música actual es de lobby pero no estamos en lobby
    const currentTrackIsLobby = this.music.current && this.music.current.includes('lobby.mp3');
    
    if (isInGame || isGameVisible || (!isLobbyVisible && currentTrackIsLobby)) {
      // Estamos en el juego o la música actual es de lobby pero no estamos en lobby
      console.log('🎵 Contexto: JUEGO - Resumiendo música de juego');
      if (currentTrackIsLobby) {
        console.log('🎵 Forzando cambio: música de lobby detectada fuera del lobby');
      }
      this.forceGameMode(); // Forzar cambio de modo
      this.startGameMusic();
    } else if (isLobbyVisible) {
      // Estamos en el lobby
      console.log('🎵 Contexto: LOBBY - Resumiendo música de lobby');
      this.startLobbyMusic();
    } else {
      // Si no podemos determinar, mantener el modo actual
      console.log('🎵 Contexto ambiguo - Manteniendo modo actual:', this.music.mode);
      if (this.music.mode === 'game') {
        this.startGameMusic();
      } else {
        this.startLobbyMusic();
      }
    }
  }
  
  // Estado actual
  getStatus() {
    const silentDuration = this.music.silentMode ? Date.now() - this.music.silentStartTime : 0;
    return {
      soundEnabled: this.soundEnabled,
      musicEnabled: this.musicEnabled,
      musicPlaying: this.music.isPlaying,
      currentTrack: this.music.current,
      mode: this.music.mode,
      silentMode: this.music.silentMode,
      silentDuration: Math.round(silentDuration / 1000), // en segundos
      trackIndex: this.music.trackIndex,
      timerActive: !!this.music.changeTimer,
      trackFinished: this.music.currentTrackFinished,
      waitingForNextCycle: this.music.waitingForNextCycle
    };
  }
  
  // Debug: verificar archivos de música
  async checkMusicFiles() {
    console.log('🎵 Verificando archivos de música...');
    
    // Verificar archivo de lobby
    try {
      const lobbyResponse = await fetch(this.musicConfig.lobby.track, { method: 'HEAD' });
      console.log(`🎵 Lobby music (${this.musicConfig.lobby.track}):`, lobbyResponse.ok ? '✅ Disponible' : '❌ No encontrado');
    } catch (error) {
      console.log(`🎵 Lobby music (${this.musicConfig.lobby.track}): ❌ Error`, error);
    }
    
    // Verificar archivos de juego
    for (const track of this.musicConfig.game.tracks) {
      try {
        const response = await fetch(track, { method: 'HEAD' });
        console.log(`🎵 Game music (${track}):`, response.ok ? '✅ Disponible' : '❌ No encontrado');
      } catch (error) {
        console.log(`🎵 Game music (${track}): ❌ Error`, error);
      }
    }
  }
  
  // Función de test manual
  testMusic() {
    console.log('🎵 Iniciando test manual de música...');
    console.log('🎵 Estado actual:', this.getStatus());
    
    this.musicEnabled = true;
    this.soundEnabled = true;
    
    console.log('🎵 Intentando iniciar música de lobby manualmente...');
    this.startLobbyMusic();
  }
  
  // Iniciar música automáticamente al cargar la página
  autoStartMusic() {
    console.log('🎵 Iniciando música automáticamente...');
    
    // Asegurar que el audio esté habilitado por defecto
    this.musicEnabled = true;
    this.soundEnabled = true;
    
    // Iniciar música de lobby por defecto
    this.startLobbyMusic();
    
    // Actualizar UI de botones
    if (typeof updateMusicButtonsUI === 'function') {
      updateMusicButtonsUI(true);
    }
    
    // Actualizar estado global si existe
    if (typeof window !== 'undefined' && window.state) {
      window.state.musicPlaying = true;
    }
  }
  
  // Agregar listener para primera interacción del usuario
  addFirstInteractionListener() {
    if (this.firstInteractionAdded) return;
    this.firstInteractionAdded = true;
    
    const events = ['click', 'touchstart', 'keydown'];
    const handleFirstInteraction = () => {
      console.log('🎵 Primera interacción detectada, iniciando música...');
      this.enableUserInteraction();
      
      // Remover listeners
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
    
    // Agregar listeners a todos los eventos de interacción
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });
    
    console.log('🎵 Esperando primera interacción del usuario para iniciar música...');
  }

  // Métodos de control de volumen
  setMasterVolumeLevel(volume) {
    this.volumes.master = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    console.log('🎵 Master volume set to:', this.volumes.master);
  }

  setMusicVolume(volume) {
    this.volumes.music = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    console.log('🎵 Music volume set to:', this.volumes.music);
  }

  setFxVolume(volume) {
    this.volumes.fx = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    console.log('🎵 FX volume set to:', this.volumes.fx);
  }

  setVoiceVolume(volume) {
    this.volumes.voice = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    console.log('🎵 Voice volume set to:', this.volumes.voice);
  }

  // Aplicar volúmenes a todos los elementos de audio
  updateAllVolumes() {
    const masterVol = this.volumes.master;
    const musicVol = this.volumes.music;
    const fxVol = this.volumes.fx;

    // Música principal (AudioManager)
    if (this.sounds.music) {
      this.sounds.music.volume = masterVol * musicVol * this.music.volume;
    }

    // Música de fondo antigua (si existe)
    if (this.sounds.background) {
      this.sounds.background.volume = masterVol * musicVol * 0.3;
    }

    // Efectos de sonido
    if (this.sounds.bell) {
      this.sounds.bell.volume = masterVol * fxVol * 0.7;
    }
    if (this.sounds.card) {
      this.sounds.card.volume = masterVol * fxVol * 0.4;
    }
    if (this.sounds.chatNotify) {
      this.sounds.chatNotify.volume = masterVol * fxVol * 0.5;
    }
    if (this.sounds.panel) {
      this.sounds.panel.volume = masterVol * fxVol * 0.6;
    }
  }

  // Transiciones suaves de música
  fadeToNewMusic(newSrc, newVolume = null, fadeDuration = 1000) {
    return new Promise((resolve) => {
      if (!this.sounds.music) {
        resolve();
        return;
      }

      const currentAudio = this.sounds.music;
      const targetVolume = newVolume || (this.volumes.master * this.volumes.music * this.music.volume);
      
      // Fade out actual
      if (!currentAudio.paused) {
        const fadeOutSteps = 20;
        const fadeOutInterval = fadeDuration / 2 / fadeOutSteps;
        const volumeStep = currentAudio.volume / fadeOutSteps;
        
        const fadeOut = setInterval(() => {
          currentAudio.volume = Math.max(0, currentAudio.volume - volumeStep);
          
          if (currentAudio.volume <= 0) {
            clearInterval(fadeOut);
            currentAudio.pause();
            
            // Cambiar fuente y configurar loop según el modo
            currentAudio.src = newSrc;
            currentAudio.loop = this.music.mode === 'lobby' ? this.musicConfig.lobby.loop : this.musicConfig.game.loop;
            currentAudio.volume = 0;
            
            currentAudio.play().then(() => {
              // Fade in nueva música
              const fadeInSteps = 20;
              const fadeInInterval = fadeDuration / 2 / fadeInSteps;
              const volumeStepIn = targetVolume / fadeInSteps;
              
              const fadeIn = setInterval(() => {
                currentAudio.volume = Math.min(targetVolume, currentAudio.volume + volumeStepIn);
                
                if (currentAudio.volume >= targetVolume) {
                  clearInterval(fadeIn);
                  resolve();
                }
              }, fadeInInterval);
            }).catch(error => {
              console.warn('Error en fade in:', error);
              resolve();
            });
          }
        }, fadeOutInterval);
      } else {
        // Si no hay música reproduciéndose, solo cambiar directamente
        currentAudio.src = newSrc;
        currentAudio.loop = this.music.mode === 'lobby' ? this.musicConfig.lobby.loop : this.musicConfig.game.loop;
        currentAudio.volume = targetVolume;
        currentAudio.play().then(() => resolve()).catch(() => resolve());
      }
    });
  }
}

// Inicialización segura del AudioManager
(function initializeAudioManager() {
  console.log('🎵 Inicializando AudioManager...');
  
  try {
    window.audioManager = new AudioManager();
    console.log('✅ AudioManager inicializado correctamente');
    
    // Hacer disponibles funciones de debug globalmente
    window.testMusic = () => window.audioManager.testMusic();
    window.checkMusicFiles = () => window.audioManager.checkMusicFiles();
    window.startLobbyMusic = () => window.audioManager.startLobbyMusic();
    window.startGameMusic = () => window.audioManager.startGameMusic();
    window.musicStatus = () => console.log('🎵 Estado detallado:', window.audioManager.getStatus());
    window.toggleSilentMode = () => {
      if (window.audioManager.music.silentMode) {
        window.audioManager.exitSilentMode();
        console.log('🔊 Modo silencioso DESACTIVADO');
      } else {
        window.audioManager.enterSilentMode();
        console.log('🔇 Modo silencioso ACTIVADO');
      }
    };
    window.simulateTrackEnd = () => {
      window.audioManager.onTrackEnded();
      console.log('🎵 Simulado fin de canción');
    };
    window.forceNextTrack = () => {
      window.audioManager.changeGameTrack();
      console.log('🎵 Forzado cambio a siguiente canción');
    };
    window.forceGameMode = () => {
      window.audioManager.forceGameMode();
      console.log('🎮 Forzado cambio a modo juego');
    };
    window.debugContext = () => {
      const lobbyOverlay = document.getElementById('lobbyOverlay');
      const gameBoard = document.getElementById('gameBoard');
      const playerCards = document.getElementById('playerCards');
      console.log('🔍 Debug contexto UI:');
      console.log('  - lobbyOverlay:', lobbyOverlay?.style.display);
      console.log('  - gameBoard:', gameBoard?.style.display);  
      console.log('  - playerCards:', playerCards?.style.display);
      console.log('  - gameState:', window.gameState);
      console.log('  - AudioManager mode:', window.audioManager.music.mode);
    };

    console.log('🎵 Funciones de debug disponibles:');
    console.log('  - testMusic() - Prueba música manualmente');
    console.log('  - checkMusicFiles() - Verifica archivos de música');
    console.log('  - startLobbyMusic() - Inicia música de lobby');
    console.log('  - startGameMusic() - Inicia música de juego');
    console.log('  - musicStatus() - Estado detallado del audio');
    console.log('  - toggleSilentMode() - Activar/desactivar modo silencioso');
    console.log('  - simulateTrackEnd() - Simular fin de canción');
    console.log('  - forceNextTrack() - Forzar cambio a siguiente canción');
    console.log('  - forceGameMode() - Forzar cambio a modo juego');
    console.log('  - debugContext() - Verificar contexto actual de UI');

    // Verificar archivos de música después de un momento
    setTimeout(() => {
      if (window.audioManager) {
        window.audioManager.checkMusicFiles();
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error al inicializar AudioManager:', error);
  }
})();
