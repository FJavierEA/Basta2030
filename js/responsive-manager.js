/**
 * DETECCIÓN INTELIGENTE DE RESOLUCIÓN Y CARGA DE CSS
 * Enfoque híbrido: CSS base + módulos específicos + scroll inteligente
 */

class ResponsiveManager {
  constructor() {
    this.currentResolution = null;
    this.cssLoaded = new Set();
    this.init();
  }

  init() {
    this.detectResolution();
    this.loadAppropriateCSS();
    this.setupScrollControl();
    this.setupResizeListener();
    this.setupOrientationListener();
    this.setupPanelToggle();
    
    // Ajuste inicial después de un pequeño delay para que el CSS se cargue
    setTimeout(() => {
      this.adjustLayoutForSize();
      this.updatePanelToggleVisibility();
    }, 100);
  }

  detectResolution() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Detectar resoluciones específicas - HORIZONTALES Y VERTICALES
    const resolutions = {
      // === HORIZONTALES (Desktop/Laptop) ===
      '4k': { width: 2560, height: 1440, css: 'css/4k-2560x1440.css', scroll: false },
      'wqhd': { width: 2560, height: 1440, css: 'css/4k-2560x1440.css', scroll: false },
      '1680x1050': { width: 1680, height: 1050, css: 'css/desktop-1680x1050.css', scroll: false },
      '1440x900': { width: 1440, height: 900, css: 'css/desktop-1440x900.css', scroll: false },
      'laptop': { width: 1366, height: 768, css: 'css/laptop-1366x768.css', scroll: false },
      'hd': { width: 1280, height: 720, css: 'css/hd-1280x720.css', scroll: false },
      'netbook': { width: 1024, height: 600, css: 'css/netbook-1024x600.css', scroll: true },
      
      // === VERTICALES (Mobile/Portrait) ===
      'mobile-4k': { width: 2160, height: 3840, css: 'css/mobile/mobile-4k-2160x3840.css', scroll: true },
      'mobile-qhd': { width: 1440, height: 2560, css: 'css/mobile/mobile-qhd-1440x2560.css', scroll: true },
      'mobile-fhd': { width: 1080, height: 1920, css: 'css/mobile/mobile-fhd-1080x1920.css', scroll: true },
      'mobile-hd': { width: 720, height: 1280, css: 'css/mobile/mobile-hd-720x1280.css', scroll: true },
      'tablet': { width: 768, height: 1024, css: 'css/tablet-768x1024.css', scroll: true }
    };

    // Detectar resolución exacta o más cercana
    for (const [key, config] of Object.entries(resolutions)) {
      if (width === config.width && height === config.height) {
        this.currentResolution = { key, ...config };
        return;
      }
    }

    // Detección por rangos si no hay coincidencia exacta
    // Determinar si es orientación vertical (móvil) u horizontal (desktop)
    const isPortrait = height > width;
    
    if (isPortrait) {
      // === DETECCIÓN MÓVIL (Vertical) ===
      if (width >= 1800) {
        this.currentResolution = { key: 'mobile-4k', ...resolutions['mobile-4k'] };
      } else if (width >= 1200) {
        this.currentResolution = { key: 'mobile-qhd', ...resolutions['mobile-qhd'] };
      } else if (width >= 900) {
        this.currentResolution = { key: 'mobile-fhd', ...resolutions['mobile-fhd'] };
      } else if (width >= 600) {
        this.currentResolution = { key: 'mobile-hd', ...resolutions['mobile-hd'] };
      } else {
        // Fallback para móviles muy pequeños
        this.currentResolution = { key: 'mobile-hd', ...resolutions['mobile-hd'] };
      }
    } else {
      // === DETECCIÓN DESKTOP (Horizontal) ===
      if (width >= 2200) {
        this.currentResolution = { key: '4k', ...resolutions['4k'] };
      } else if (width >= 1550) {
        this.currentResolution = { key: '1680x1050', ...resolutions['1680x1050'] };
      } else if (width >= 1400) {
        this.currentResolution = { key: '1440x900', ...resolutions['1440x900'] };
      } else if (width >= 1320) {
        this.currentResolution = { key: 'laptop', ...resolutions['laptop'] };
      } else if (width >= 1200) {
        this.currentResolution = { key: 'hd', ...resolutions['hd'] };
      } else {
        this.currentResolution = { key: 'netbook', ...resolutions['netbook'] };
      }
    }

    console.log(`🎯 Resolución detectada: ${this.currentResolution.key} (${width}x${height})`);
  }

  loadAppropriateCSS() {
    if (!this.currentResolution || this.cssLoaded.has(this.currentResolution.key)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/' + this.currentResolution.css; // Ruta absoluta desde raíz
    link.id = `css-${this.currentResolution.key}`;
    
    // Añadir al head
    document.head.appendChild(link);
    this.cssLoaded.add(this.currentResolution.key);

    // Añadir clase al body para identificación
    document.body.className = document.body.className.replace(/resolution-\w+/g, '');
    document.body.classList.add(`resolution-${this.currentResolution.key}`);

    console.log(`📄 CSS cargado: ${this.currentResolution.css}`);
  }

  setupScrollControl() {
    if (!this.currentResolution) return;

    const html = document.documentElement;
    const body = document.body;

    if (this.currentResolution.scroll) {
      // Activar scroll para resoluciones pequeñas
      html.style.overflow = 'auto';
      body.style.overflow = 'auto';
      body.classList.add('scroll-enabled');
      
      // Añadir indicadores de scroll
      this.addScrollIndicators();
      
      console.log('📜 Scroll activado para resolución pequeña');
    } else {
      // Desactivar scroll para resoluciones grandes
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.classList.remove('scroll-enabled');
      
      console.log('🚫 Scroll desactivado para resolución grande');
    }
  }

  addScrollIndicators() {
    // Crear indicador de scroll hacia abajo para ver cartas
    const scrollIndicator = document.createElement('div');
    scrollIndicator.id = 'scroll-indicator';
    scrollIndicator.innerHTML = `
      <div class="scroll-hint">
        <span>↓ Desplaza para ver tus cartas ↓</span>
      </div>
    `;
    scrollIndicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 9999;
      animation: pulse 2s infinite;
    `;

    document.body.appendChild(scrollIndicator);

    // Ocultar indicador cuando se haga scroll
    let scrollTimer;
    window.addEventListener('scroll', () => {
      scrollIndicator.style.opacity = '0.3';
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollIndicator.style.opacity = '1';
      }, 1000);
    });

    // CSS para animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  setupResizeListener() {
    let resizeTimer;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      
      // Detectar inmediatamente para cambios críticos
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      // Si cambió significativamente (más de 50px) aplicar cambio inmediato
      const significantChange = Math.abs(currentWidth - lastWidth) > 50 || 
                               Math.abs(currentHeight - lastHeight) > 50;
      
      if (significantChange) {
        const oldResolution = this.currentResolution?.key;
        this.detectResolution();
        
        if (oldResolution !== this.currentResolution?.key) {
          console.log(`🔄 Cambio inmediato: ${oldResolution} → ${this.currentResolution?.key} (${currentWidth}x${currentHeight})`);
          this.loadAppropriateCSS();
          this.setupScrollControl();
          this.adjustLayoutForSize();
          this.updatePanelToggleVisibility();
        }
        
        lastWidth = currentWidth;
        lastHeight = currentHeight;
      }
      
      // Timer para cambios menores (debounce)
      resizeTimer = setTimeout(() => {
        const oldResolution = this.currentResolution?.key;
        this.detectResolution();
        
        // Recargar si cambió la resolución
        if (oldResolution !== this.currentResolution?.key) {
          console.log(`🔄 Cambio de resolución: ${oldResolution} → ${this.currentResolution?.key} (${window.innerWidth}x${window.innerHeight})`);
          this.loadAppropriateCSS();
          this.setupScrollControl();
          this.adjustLayoutForSize();
          this.updatePanelToggleVisibility();
        } else {
          // Aunque no cambie de responsiva, ajustar elementos críticos
          this.adjustLayoutForSize();
        }
        
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
      }, 150); // Reducido de 250ms a 150ms para mayor responsividad
    });
  }

  // Ajustar layout dinámicamente para cambios de tamaño
  adjustLayoutForSize() {
    if (!this.currentResolution) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    
    // Ajustar elementos críticos según el tamaño actual
    this.adjustGameArea(width, height, isPortrait);
    this.adjustRuleta(width, height, isPortrait);
    this.adjustCards(width, height, isPortrait);
    this.adjustMessages(width, height, isPortrait);
    this.adjustPanels(width, height, isPortrait);
    
    console.log(`🎯 Layout ajustado para: ${width}x${height} (${this.currentResolution.key})`);
  }
  
  adjustGameArea(width, height, isPortrait) {
    const gameArea = document.querySelector('.game-area');
    if (!gameArea) return;
    
    // Ajustar padding dinámicamente
    if (isPortrait) {
      // Móvil - padding proporcional
      const padding = Math.max(10, Math.min(30, width * 0.02));
      gameArea.style.padding = `${padding}px`;
    } else {
      // Desktop - padding basado en ancho
      const padding = Math.max(5, Math.min(40, width * 0.015));
      gameArea.style.padding = `${padding}px`;
    }
  }
  
  adjustRuleta(width, height, isPortrait) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    let size;
    if (isPortrait) {
      // Móvil - 70% del ancho máximo
      size = Math.max(300, Math.min(700, width * 0.7));
    } else {
      // Desktop - basado en altura disponible
      size = Math.max(380, Math.min(890, height * 0.6));
    }
    
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
  }
  
  adjustCards(width, height, isPortrait) {
    const cards = document.querySelectorAll('.card');
    if (cards.length === 0) return;
    
    let cardWidth, cardHeight, fontSize;
    
    if (isPortrait) {
      // Móvil - cartas proporcionales
      cardWidth = Math.max(100, Math.min(200, width * 0.25));
      cardHeight = cardWidth * 1.4; // Ratio 1:1.4
      fontSize = Math.max(8, Math.min(16, width * 0.02));
    } else {
      // Desktop - cartas basadas en resolución
      if (width >= 2560) {
        cardWidth = 180; cardHeight = 230; fontSize = 18;
      } else if (width >= 1680) {
        cardWidth = 140; cardHeight = 200; fontSize = 9;
      } else if (width >= 1440) {
        cardWidth = 120; cardHeight = 160; fontSize = 6;
      } else if (width >= 1280) {
        cardWidth = 130; cardHeight = 190; fontSize = 6;
      } else {
        cardWidth = 130; cardHeight = 190; fontSize = 6;
      }
    }
    
    cards.forEach(card => {
      if (card.closest('.player-hand')) {
        card.style.width = `${cardWidth + 10}px`;
        card.style.height = `${cardHeight + 10}px`;
      } else {
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
      }
      card.style.fontSize = `${fontSize}px`;
    });
  }
  
  adjustMessages(width, height, isPortrait) {
    const turnMessage = document.getElementById('turnMessage');
    const message = document.getElementById('message');
    
    if (turnMessage) {
      if (isPortrait) {
        turnMessage.style.fontSize = `${Math.max(12, Math.min(20, width * 0.025))}px`;
        turnMessage.style.maxWidth = '90%';
        turnMessage.style.top = `${Math.max(10, height * 0.015)}px`;
      } else {
        turnMessage.style.fontSize = `${Math.max(10, Math.min(18, width * 0.012))}px`;
        turnMessage.style.maxWidth = `${Math.min(600, width * 0.4)}px`;
      }
    }
    
    if (message) {
      if (isPortrait) {
        message.style.fontSize = `${Math.max(10, Math.min(18, width * 0.022))}px`;
        message.style.maxWidth = '90%';
        message.style.top = `${Math.max(50, height * 0.05)}px`;
      } else {
        message.style.fontSize = `${Math.max(8, Math.min(14, width * 0.01))}px`;
        message.style.maxWidth = `${Math.min(320, width * 0.25)}px`;
      }
    }
  }
  
  adjustPanels(width, height, isPortrait) {
    const panels = document.querySelectorAll('.info-panel-left, .players-list-panel');
    
    panels.forEach(panel => {
      if (isPortrait) {
        // Móvil - paneles más compactos
        const fontSize = Math.max(10, Math.min(18, width * 0.025));
        panel.style.fontSize = `${fontSize}px`;
        
        if (panel.classList.contains('players-list-panel')) {
          panel.style.maxHeight = `${Math.max(150, height * 0.2)}px`;
        }
      } else {
        // Desktop - paneles normales
        const fontSize = Math.max(12, Math.min(16, width * 0.015));
        panel.style.fontSize = `${fontSize}px`;
      }
    });
    
    // Validar que los elementos no se salgan de pantalla
    this.validateElementPositions(width, height);
  }
  
  // Validar y corregir posiciones de elementos críticos
  validateElementPositions(width, height) {
    // Validar mensajes
    const turnMessage = document.getElementById('turnMessage');
    const message = document.getElementById('message');
    
    [turnMessage, message].forEach(element => {
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      
      // Si se sale por la derecha, reajustar
      if (rect.right > width) {
        element.style.left = '50%';
        element.style.transform = 'translateX(-50%)';
        element.style.maxWidth = '90%';
      }
      
      // Si se sale por abajo, reajustar
      if (rect.bottom > height) {
        const newTop = Math.max(10, height - rect.height - 20);
        element.style.top = `${newTop}px`;
      }
    });
    
    // Validar paneles flotantes
    const panels = document.querySelectorAll('.info-panel-left, .players-list-panel');
    panels.forEach(panel => {
      const rect = panel.getBoundingClientRect();
      
      // Ajustar si se sale de pantalla
      if (rect.right > width) {
        panel.style.right = '10px';
        panel.style.left = 'auto';
      }
      
      if (rect.bottom > height) {
        panel.style.bottom = '10px';
        panel.style.top = 'auto';
      }
    });
    
    // Validar que la ruleta no sea demasiado grande
    const container = document.querySelector('.container');
    if (container) {
      const rect = container.getBoundingClientRect();
      if (rect.width > width * 0.9 || rect.height > height * 0.7) {
        const maxSize = Math.min(width * 0.8, height * 0.6);
        container.style.width = `${maxSize}px`;
        container.style.height = `${maxSize}px`;
      }
    }
  }

  // Configurar funcionalidad del panel toggle
  setupPanelToggle() {
    // Crear el botón si no existe
    this.ensurePanelToggleExists();
    
    // Obtener referencia al botón y panel
    this.panelToggleBtn = document.querySelector('.panel-toggle-btn');
    this.infoPanelLeft = document.querySelector('.info-panel-left');
    
    if (!this.panelToggleBtn || !this.infoPanelLeft) {
      console.warn('⚠️ Panel toggle o info-panel-left no encontrados');
      return;
    }
    
    // Remover listeners previos para evitar duplicados
    this.panelToggleBtn.replaceWith(this.panelToggleBtn.cloneNode(true));
    this.panelToggleBtn = document.querySelector('.panel-toggle-btn');
    
    // Agregar listener de click
    this.panelToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePanel();
    });
    
    console.log('🔘 Panel toggle configurado correctamente');
  }
  
  // Asegurar que el botón toggle existe en el DOM
  ensurePanelToggleExists() {
    if (document.querySelector('.panel-toggle-btn')) return;
    
    const infoPanelLeft = document.querySelector('.info-panel-left');
    if (!infoPanelLeft) return;
    
    // Crear el botón toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'panel-toggle-btn';
    toggleBtn.innerHTML = `
      <div class="hamburger-icon">
        <div></div>
        <div></div>
        <div></div>
      </div>
    `;
    toggleBtn.setAttribute('aria-label', 'Abrir menú');
    
    // Insertarlo al inicio del panel
    infoPanelLeft.insertBefore(toggleBtn, infoPanelLeft.firstChild);
    
    console.log('➕ Panel toggle button creado');
  }
  
  // Función para alternar el panel
  togglePanel() {
    if (!this.infoPanelLeft) return;
    
    const isExpanded = this.infoPanelLeft.classList.contains('expanded');
    
    if (isExpanded) {
      // Colapsar panel
      this.infoPanelLeft.classList.remove('expanded');
      this.panelToggleBtn.setAttribute('aria-label', 'Abrir menú');
      console.log('📴 Panel colapsado');
    } else {
      // Expandir panel
      this.infoPanelLeft.classList.add('expanded');
      this.panelToggleBtn.setAttribute('aria-label', 'Cerrar menú');
      console.log('📋 Panel expandido');
    }
    
    // Reproducir sonido si existe
    const panelSound = document.getElementById('panelSound');
    if (panelSound) {
      panelSound.currentTime = 0;
      panelSound.play().catch(() => {});
    }
  }
  
  // Actualizar visibilidad del panel toggle según resolución
  updatePanelToggleVisibility() {
    if (!this.currentResolution) return;
    
    const toggleBtn = document.querySelector('.panel-toggle-btn');
    if (!toggleBtn) return;
    
    // Resoluciones donde el panel toggle debe ser visible
    const resolutionsWithToggle = [
      'netbook',           // 1024x600
      'hd',                // 1280x720  
      'laptop',            // 1366x768
      'mobile-hd',         // 720x1280
      'mobile-fhd',        // 1080x1920
      'mobile-qhd',        // 1440x2560
      'mobile-4k'          // 2160x3840
    ];
    
    if (resolutionsWithToggle.includes(this.currentResolution.key)) {
      // Mostrar y activar panel toggle
      toggleBtn.style.display = 'flex';
      toggleBtn.style.pointerEvents = 'auto';
      console.log(`👁️ Panel toggle visible para: ${this.currentResolution.key}`);
    } else {
      // Ocultar panel toggle y expandir panel automáticamente
      toggleBtn.style.display = 'none';
      toggleBtn.style.pointerEvents = 'none';
      
      // Expandir panel automáticamente en resoluciones grandes
      const infoPanelLeft = document.querySelector('.info-panel-left');
      if (infoPanelLeft) {
        infoPanelLeft.classList.add('expanded');
      }
      
      console.log(`🚫 Panel toggle oculto para: ${this.currentResolution.key}`);
    }
  }

  // Listener para cambios de orientación en móviles
  setupOrientationListener() {
    // Escuchar cambios de orientación en dispositivos móviles
    window.addEventListener('orientationchange', () => {
      // Delay porque orientationchange se dispara antes del resize
      setTimeout(() => {
        console.log('📱 Cambio de orientación detectado');
        const oldResolution = this.currentResolution?.key;
        this.detectResolution();
        
        if (oldResolution !== this.currentResolution?.key) {
          console.log(`🔄 Nueva orientación: ${oldResolution} → ${this.currentResolution?.key}`);
          this.loadAppropriateCSS();
          this.setupScrollControl();
          this.adjustLayoutForSize();
          this.updatePanelToggleVisibility();
        }
      }, 500); // Delay mayor para orientationchange
    });
    
    // También escuchar cuando cambia el viewport visual (teclado móvil, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        // Ajustar solo elementos críticos, no cambiar responsiva completa
        setTimeout(() => {
          this.adjustMessages(window.innerWidth, window.innerHeight, window.innerHeight > window.innerWidth);
        }, 100);
      });
    }
  }

  // Método para debugging
  getCurrentInfo() {
    const toggleBtn = document.querySelector('.panel-toggle-btn');
    const infoPanelLeft = document.querySelector('.info-panel-left');
    
    return {
      resolution: this.currentResolution,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      scrollEnabled: document.body.classList.contains('scroll-enabled'),
      cssLoaded: Array.from(this.cssLoaded),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      panelToggle: {
        exists: !!toggleBtn,
        visible: toggleBtn ? toggleBtn.style.display !== 'none' : false,
        panelExpanded: infoPanelLeft ? infoPanelLeft.classList.contains('expanded') : false
      }
    };
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.responsiveManager = new ResponsiveManager();
  
  // Debugging en consola
  console.log('🎮 ResponsiveManager iniciado');
  console.log('📊 Info actual:', window.responsiveManager.getCurrentInfo());
});

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveManager;
}