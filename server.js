/**
 * BASTA - Servidor
 * - Lobbies con auto-asignación
 * - Inicio con cuenta regresiva
 * - Mazo 64 cartas (8 categorías × 8 cartas) con imágenes únicas
 * - Turnos: tirar dado -> girar ruleta -> jugar -> campana -> verificación
 * - Verificación: válidas a descartes, inválidas regresan + penalización
 * - Chat y señalización básica de voz (WebRTC) relay
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta del proyecto
app.use(express.static(path.join(__dirname)));

const COUNTDOWN_SECONDS = Number(process.env.COUNTDOWN_SECONDS || 3);
const MAX_PLAYERS = 4;
const MIN_PLAYERS_TO_START = 2;
const INITIAL_HAND = 11;

// Mensajes de sanción aleatorios
const PENALTY_MESSAGES = [
  { singular: 'sancionado', plural: 'sancionados' },
  { singular: 'intentó hacer trampa', plural: 'intentaron hacer trampa' },
  { singular: 'no sabe leer', plural: 'no saben leer' }
];

// ===== Configuración de mapeo del anillo y ruleta =====
// IMPORTANTE: OUTER_RING_ORDER debe coincidir con el orden visual del anillo exterior,
// en sentido horario desde el punto del puntero (arriba) o según tu UI.
// Ajusta OUTER_OFFSET_DEG si tu puntero está arriba (generalmente 90°) u otra posición.
const OUTER_RING_ORDER = [
  'poverty',      // 0 - Sección 1: Pobreza y desigualdad social  
  'hunger',       // 1 - Sección 2: Hambre y falta de acceso a alimentos
  'health',       // 2 - Sección 3: Salud y bienestar insuficientes  
  'education',    // 3 - Sección 4: Educación desigual o limitada
  'gender',       // 4 - Sección 5: Desigualdad de género y discriminación
  'environment',  // 5 - Sección 6: Degradación ambiental y cambio climático
  'consumption',  // 6 - Sección 7: Consumo y producción no sostenibles
  'institutions'  // 7 - Sección 8: Falta de paz, justicia e instituciones sólidas
];

// Nombres de las secciones exteriores (anillos externos)
const OUTER_SECTION_NAMES = {
  'poverty': 'Pobreza y desigualdad social',
  'hunger': 'Hambre y falta de acceso a alimentos', 
  'health': 'Salud y bienestar insuficientes',
  'education': 'Educación desigual o limitada',
  'gender': 'Desigualdad de género y discriminación',
  'environment': 'Degradación ambiental y cambio climático',
  'consumption': 'Consumo y producción no sostenibles',
  'institutions': 'Falta de paz, justicia e instituciones sólidas'
};

// Nombres de las secciones interiores (números 1-17 de ODS)
const INNER_SECTION_NAMES = {
  1: 'Fin de la pobreza',
  2: 'Hambre cero', 
  3: 'Salud y bienestar',
  4: 'Educación de calidad',
  5: 'Igualdad de género',
  6: 'Agua limpia y saneamiento',
  7: 'Energía asequible y no contaminante',
  8: 'Trabajo decente y crecimiento económico',
  9: 'Industria, innovación e infraestructura',
  10: 'Reducción de las desigualdades',
  11: 'Ciudades y comunidades sostenibles',
  12: 'Producción y consumo responsables',
  13: 'Acción por el clima',
  14: 'Vida submarina',
  15: 'Vida de ecosistemas terrestres',
  16: 'Paz, justicia e instituciones sólidas',
  17: 'Alianzas para lograr objetivos'
};

const OUTER_SECTORS = 8;
const INNER_SECTORS = 17;
// Offset para compensar dónde apunta el puntero de selección de la ruleta.
// Si el puntero está arriba (12 en punto) y tu 0° es hacia la derecha, usa +90.
const OUTER_OFFSET_DEG = 90;
const INNER_OFFSET_DEG = 90;
// Si tu rotación positiva es horaria (CSS transform: rotate gira horario), deja CLOCKWISE = true.
const CLOCKWISE = true;

function normAngle(deg) {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}
function sectorIndexFromRotation(rotation, sectors, offsetDeg) {
  // Aplica dirección y offset del puntero
  let angle = CLOCKWISE ? rotation : -rotation;
  angle = normAngle(angle + offsetDeg);
  const sectorDeg = 360 / sectors;
  return Math.floor(angle / sectorDeg) % sectors;
}

// ====== Datos de cartas (68 totales según notas.txt) ======
const SECTIONS = [
  'poverty',          // 0 - Sección 1: Pobreza y desigualdad social
  'hunger',           // 1 - Sección 2: Hambre y falta de acceso a alimentos
  'health',           // 2 - Sección 3: Salud y bienestar insuficientes
  'education',        // 3 - Sección 4: Educación desigual o limitada
  'gender',           // 4 - Sección 5: Desigualdad de género y discriminación
  'environment',      // 5 - Sección 6: Degradación ambiental y cambio climático
  'consumption',      // 6 - Sección 7: Consumo y producción no sostenibles
  'institutions'      // 7 - Sección 8: Falta de paz, justicia e instituciones sólidas
];

const SECTION_COLORS = {
  poverty: '#CC5555',      // hsl(0,70%,55%) - Rojo
  hunger: '#CC9955',       // hsl(45,70%,55%) - Naranja/Amarillo  
  health: '#99CC55',       // hsl(90,70%,55%) - Verde
  education: '#55CC99',    // hsl(135,70%,55%) - Verde azulado
  gender: '#55CCCC',       // hsl(180,70%,55%) - Cian
  environment: '#5599CC',  // hsl(225,70%,55%) - Azul
  consumption: '#9955CC',  // hsl(270,70%,55%) - Púrpura
  institutions: '#CC5599'  // hsl(315,70%,55%) - Rosa
};

// Ya no necesitamos mapeo porque OUTER_RING_ORDER tiene los valores correctos

// Datos reales de las 68 cartas basados en notas.txt
const CARDS_DATA = [
  // Sección 1: Pobreza y desigualdad social (cartas 1-9)
  { id: 1, text: "Apoyo económico\nInclusión económica\nDerechos humanos", odsNumbers: [1, 5, 8, 10, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_1.png', color: SECTION_COLORS.poverty },
  { id: 2, text: "Inclusión social\nEmpleo digno\nPolíticas equitativas\nTransparencia", odsNumbers: [1, 5, 8, 10, 16], section: 'poverty', sectionIndex: 0, image: 'PDS_2.png', color: SECTION_COLORS.poverty },
  { id: 3, text: "Protección social\nEmprendimiento\nCooperación internacional", odsNumbers: [1, 3, 5, 8, 9, 13, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_3.png', color: SECTION_COLORS.poverty },
  { id: 4, text: "Acceso justo\nParticipación ciudadana\nFinanciamiento sostenible", odsNumbers: [5, 8, 9, 10, 12, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_4.png', color: SECTION_COLORS.poverty },
  { id: 5, text: "Empleo digno\nGobernanza\nInclusión económica", odsNumbers: [1, 5, 8, 16, 10], section: 'poverty', sectionIndex: 0, image: 'PDS_5.png', color: SECTION_COLORS.poverty },
  { id: 6, text: "Apoyo económico\nFormación profesional\nCooperación internacional", odsNumbers: [1, 4, 5, 8, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_6.png', color: SECTION_COLORS.poverty },
  { id: 7, text: "Inclusión social\nPolíticas equitativas\nParticipación política", odsNumbers: [1, 10, 5, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_7.png', color: SECTION_COLORS.poverty },
  { id: 8, text: "Protección social\nSostenibilidad económica\nAcceso justo", odsNumbers: [1, 3, 5, 8, 9, 10, 12], section: 'poverty', sectionIndex: 0, image: 'PDS_8.png', color: SECTION_COLORS.poverty },
  { id: 9, text: "Apoyo económico\nCapacitación docente\nInclusión económica\nParticipación política", odsNumbers: [1, 4, 5, 8, 10, 16, 17], section: 'poverty', sectionIndex: 0, image: 'PDS_9.png', color: SECTION_COLORS.poverty },

  // Sección 2: Hambre y falta de acceso a alimentos (cartas 10-17)
  { id: 10, text: "Agricultura sostenible\nSeguridad alimentaria\nNutrición infantil", odsNumbers: [2, 3, 4, 12, 13, 15], section: 'hunger', sectionIndex: 1, image: 'HFAA_1.png', color: SECTION_COLORS.hunger },
  { id: 11, text: "Innovación agrícola\nBienestar mental\nAcceso seguro", odsNumbers: [2, 3, 4, 6, 9, 10, 12, 13, 16], section: 'hunger', sectionIndex: 1, image: 'HFAA_2.png', color: SECTION_COLORS.hunger },
  { id: 12, text: "Prevención\nInfraestructura\nReducción de desechos", odsNumbers: [2, 3, 6, 9, 11, 12, 13, 17], section: 'hunger', sectionIndex: 1, image: 'HFAA_3.png', color: SECTION_COLORS.hunger },
  { id: 13, text: "Agricultura sostenible\nReciclaje\nAtención médica\nGestión hídrica", odsNumbers: [2, 3, 6, 12, 13, 15], section: 'hunger', sectionIndex: 1, image: 'HFAA_4.png', color: SECTION_COLORS.hunger },
  { id: 14, text: "Seguridad alimentaria\nEducación ambiental\nNutrición infantil", odsNumbers: [2, 3, 4, 12, 13, 15], section: 'hunger', sectionIndex: 1, image: 'HFAA_5.png', color: SECTION_COLORS.hunger },
  { id: 15, text: "Innovación agrícola\nReducción de desechos\nAcceso seguro", odsNumbers: [2, 3, 6, 10, 12, 13], section: 'hunger', sectionIndex: 1, image: 'HFAA_6.png', color: SECTION_COLORS.hunger },
  { id: 16, text: "Bienestar mental\nReducción de emisiones\nNutrición infantil", odsNumbers: [2, 3, 4, 7, 11, 13, 16], section: 'hunger', sectionIndex: 1, image: 'HFAA_7.png', color: SECTION_COLORS.hunger },
  { id: 17, text: "Atención médica\nGestión hídrica\nReciclaje", odsNumbers: [2, 3, 6, 12, 13, 15], section: 'hunger', sectionIndex: 1, image: 'HFAA_8.png', color: SECTION_COLORS.hunger },

  // Sección 3: Salud y bienestar insuficientes (cartas 18-26)
  { id: 18, text: "Atención médica\nVacunas\nBienestar mental\nEducación ambiental", odsNumbers: [2, 3, 4, 6, 12, 13, 16, 17], section: 'health', sectionIndex: 2, image: 'SBI_1.png', color: SECTION_COLORS.health },
  { id: 19, text: "Prevención\nGestión hídrica\nAdaptación climática", odsNumbers: [2, 3, 11, 13, 15], section: 'health', sectionIndex: 2, image: 'SBI_2.png', color: SECTION_COLORS.health },
  { id: 20, text: "Acceso seguro\nReducción de emisiones\nResiliencia ambiental", odsNumbers: [3, 6, 7, 11, 13, 15], section: 'health', sectionIndex: 2, image: 'SBI_3.png', color: SECTION_COLORS.health },
  { id: 21, text: "Bienestar mental\nEducación ambiental\nTransporte limpio", odsNumbers: [3, 4, 7, 11, 12, 13, 16], section: 'health', sectionIndex: 2, image: 'SBI_4.png', color: SECTION_COLORS.health },
  { id: 22, text: "Atención médica\nInfraestructura sostenible\nEnergías limpias", odsNumbers: [2, 3, 6, 7, 9, 11, 12, 13], section: 'health', sectionIndex: 2, image: 'SBI_5.png', color: SECTION_COLORS.health },
  { id: 23, text: "Prevención\nReforestación\nSostenibilidad ambiental", odsNumbers: [2, 3, 6, 11, 12, 13, 15], section: 'health', sectionIndex: 2, image: 'SBI_6.png', color: SECTION_COLORS.health },
  { id: 24, text: "Vacunas\nEducación ambiental\nParticipación ciudadana", odsNumbers: [3, 4, 5, 9, 12, 13, 16, 17], section: 'health', sectionIndex: 2, image: 'SBI_7.png', color: SECTION_COLORS.health },
  { id: 25, text: "Bienestar mental\nResiliencia ambiental\nReducción de emisiones", odsNumbers: [3, 4, 7, 11, 13, 15], section: 'health', sectionIndex: 2, image: 'SBI_8.png', color: SECTION_COLORS.health },
  { id: 26, text: "Atención médica\nAcceso seguro\nPrevención", odsNumbers: [2, 3, 6, 10, 13], section: 'health', sectionIndex: 2, image: 'SBI_9.png', color: SECTION_COLORS.health },

  // Sección 4: Educación desigual o limitada (cartas 27-34)
  { id: 27, text: "Acceso universal\nCapacitación docente\nEducación inclusiva\nCooperación internacional", odsNumbers: [4, 5, 8, 10, 16, 17], section: 'education', sectionIndex: 3, image: 'EDL_1.png', color: SECTION_COLORS.education },
  { id: 28, text: "Igualdad educativa\nEmpoderamiento femenino\nFormación profesional", odsNumbers: [4, 5, 8, 10], section: 'education', sectionIndex: 3, image: 'EDL_2.png', color: SECTION_COLORS.education },
  { id: 29, text: "Educación igualitaria\nParticipación política\nPolíticas equitativas", odsNumbers: [4, 5, 10, 16, 17], section: 'education', sectionIndex: 3, image: 'EDL_3.png', color: SECTION_COLORS.education },
  { id: 30, text: "Acceso universal\nInnovación global\nIgualdad educativa", odsNumbers: [4, 5, 9, 10, 13, 17], section: 'education', sectionIndex: 3, image: 'EDL_4.png', color: SECTION_COLORS.education },
  { id: 31, text: "Capacitación docente\nEducación inclusiva\nIntercambio científico", odsNumbers: [4, 5, 8, 9, 10, 13, 17], section: 'education', sectionIndex: 3, image: 'EDL_5.png', color: SECTION_COLORS.education },
  { id: 32, text: "Empoderamiento femenino\nAcceso equitativo\nParticipación ciudadana", odsNumbers: [4, 5, 7, 8, 10, 16, 17], section: 'education', sectionIndex: 3, image: 'EDL_6.png', color: SECTION_COLORS.education },
  { id: 33, text: "Educación igualitaria\nCooperación internacional\nEducación inclusiva", odsNumbers: [4, 5, 10, 13, 16, 17], section: 'education', sectionIndex: 3, image: 'EDL_7.png', color: SECTION_COLORS.education },
  { id: 34, text: "Igualdad educativa\nInnovación global\nPolíticas equitativas\nGobernanza", odsNumbers: [4, 5, 9, 10, 13, 16, 17], section: 'education', sectionIndex: 3, image: 'EDL_8.png', color: SECTION_COLORS.education },

  // Sección 5: Desigualdad de género y discriminación (cartas 35-42)
  { id: 35, text: "Empoderamiento femenino\nDerechos laborales\nParticipación política", odsNumbers: [5, 8, 10, 16, 17], section: 'gender', sectionIndex: 4, image: 'DGD_1.png', color: SECTION_COLORS.gender },
  { id: 36, text: "Educación igualitaria\nInclusión económica\nEmpleo digno", odsNumbers: [1, 4, 5, 8, 10], section: 'gender', sectionIndex: 4, image: 'DGD_2.png', color: SECTION_COLORS.gender },
  { id: 37, text: "Derechos laborales\nTransparencia\nCooperación internacional", odsNumbers: [5, 8, 10, 13, 16, 17], section: 'gender', sectionIndex: 4, image: 'DGD_3.png', color: SECTION_COLORS.gender },
  { id: 38, text: "Empoderamiento femenino\nInclusión social\nPolíticas equitativas", odsNumbers: [1, 5, 8, 10, 16], section: 'gender', sectionIndex: 4, image: 'DGD_4.png', color: SECTION_COLORS.gender },
  { id: 39, text: "Participación política\nFormación profesional\nAcceso justo", odsNumbers: [4, 5, 8, 10, 16, 17], section: 'gender', sectionIndex: 4, image: 'DGD_5.png', color: SECTION_COLORS.gender },
  { id: 40, text: "Igualdad educativa\nGobernanza\nParticipación ciudadana", odsNumbers: [4, 5, 10, 16, 17], section: 'gender', sectionIndex: 4, image: 'DGD_6.png', color: SECTION_COLORS.gender },
  { id: 41, text: "Empoderamiento femenino\nEmprendimiento\nTransparencia\nPolíticas equitativas", odsNumbers: [5, 8, 9, 10, 16, 17], section: 'gender', sectionIndex: 4, image: 'DGD_7.png', color: SECTION_COLORS.gender },
  { id: 42, text: "Educación igualitaria\nInclusión económica\nDerechos humanos", odsNumbers: [1, 4, 5, 8, 10, 16], section: 'gender', sectionIndex: 4, image: 'DGD_8.png', color: SECTION_COLORS.gender },

  // Sección 6: Degradación ambiental y cambio climático (cartas 43-51)
  { id: 43, text: "Gestión hídrica\nEnergías renovables\nReforestación", odsNumbers: [6, 7, 11, 12, 13, 15], section: 'environment', sectionIndex: 5, image: 'DACC_1.png', color: SECTION_COLORS.environment },
  { id: 44, text: "Sostenibilidad ambiental\nTransporte limpio\nReducción de emisiones", odsNumbers: [6, 7, 11, 13], section: 'environment', sectionIndex: 5, image: 'DACC_2.png', color: SECTION_COLORS.environment },
  { id: 45, text: "Innovación tecnológica\nConservación natural\nReducción de plásticos", odsNumbers: [7, 9, 12, 13, 14, 15], section: 'environment', sectionIndex: 5, image: 'DACC_3.png', color: SECTION_COLORS.environment },
  { id: 46, text: "Infraestructura sostenible\nAdaptación climática\nProtección oceánica", odsNumbers: [9, 11, 13, 14, 15], section: 'environment', sectionIndex: 5, image: 'DACC_4.png', color: SECTION_COLORS.environment },
  { id: 47, text: "Eficiencia energética\nReciclaje\nBiodiversidad", odsNumbers: [6, 7, 9, 12, 13, 14], section: 'environment', sectionIndex: 5, image: 'DACC_5.png', color: SECTION_COLORS.environment },
  { id: 48, text: "Energías limpias\nRestauración ambiental\nConservación marina", odsNumbers: [7, 11, 12, 13, 14, 15], section: 'environment', sectionIndex: 5, image: 'DACC_6.png', color: SECTION_COLORS.environment },
  { id: 49, text: "Educación ambiental\nDesarrollo industrial\nEconomía circular", odsNumbers: [4, 7, 9, 12, 13], section: 'environment', sectionIndex: 5, image: 'DACC_7.png', color: SECTION_COLORS.environment },
  { id: 50, text: "Resiliencia ambiental\nReducción de emisiones\nBiodiversidad", odsNumbers: [7, 11, 13, 14, 15], section: 'environment', sectionIndex: 5, image: 'DACC_8.png', color: SECTION_COLORS.environment },
  { id: 51, text: "Conservación natural\nProtección oceánica\nAdaptación climática", odsNumbers: [7, 11, 12, 13, 14, 15], section: 'environment', sectionIndex: 5, image: 'DACC_9.png', color: SECTION_COLORS.environment },

  // Sección 7: Consumo y producción no sostenibles (cartas 52-60)
  { id: 52, text: "Reciclaje\nReducción de desechos\nEconomía circular", odsNumbers: [6, 9, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_1.png', color: SECTION_COLORS.consumption },
  { id: 53, text: "Responsabilidad empresarial\nInnovación tecnológica\nEficiencia energética", odsNumbers: [7, 8, 9, 12, 17], section: 'consumption', sectionIndex: 6, image: 'CPNS_2.png', color: SECTION_COLORS.consumption },
  { id: 54, text: "Energía asequible\nSostenibilidad económica\nEducación ambiental", odsNumbers: [4, 7, 8, 9, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_3.png', color: SECTION_COLORS.consumption },
  { id: 55, text: "Reducción de desechos\nInnovación tecnológica\nEnergías renovables\nEconomía circular", odsNumbers: [6, 7, 9, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_4.png', color: SECTION_COLORS.consumption },
  { id: 56, text: "Responsabilidad empresarial\nEficiencia energética\nEducación ambiental", odsNumbers: [4, 7, 8, 9, 12, 13, 17], section: 'consumption', sectionIndex: 6, image: 'CPNS_5.png', color: SECTION_COLORS.consumption },
  { id: 57, text: "Reciclaje\nEnergías limpias\nInnovación global", odsNumbers: [6, 7, 9, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_6.png', color: SECTION_COLORS.consumption },
  { id: 58, text: "Economía circular\nInnovación tecnológica\nAdaptación climática", odsNumbers: [7, 9, 11, 12, 13, 15], section: 'consumption', sectionIndex: 6, image: 'CPNS_7.png', color: SECTION_COLORS.consumption },
  { id: 59, text: "Reducción de desechos\nSostenibilidad ambiental\nEnergías renovables", odsNumbers: [6, 7, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_8.png', color: SECTION_COLORS.consumption },
  { id: 60, text: "Reciclaje\nInnovación tecnológica\nReciclaje", odsNumbers: [6, 7, 9, 12, 13], section: 'consumption', sectionIndex: 6, image: 'CPNS_9.png', color: SECTION_COLORS.consumption },

  // Sección 8: Falta de paz, justicia e instituciones sólidas (cartas 61-68)
  { id: 61, text: "Derechos humanos\nTransparencia\nGobernanza\nCooperación internacional", odsNumbers: [5, 10, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_1.png', color: SECTION_COLORS.institutions },
  { id: 62, text: "Participación ciudadana\nFinanciamiento sostenible\nIntercambio científico", odsNumbers: [5, 8, 9, 12, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_2.png', color: SECTION_COLORS.institutions },
  { id: 63, text: "Gobernanza\nPolíticas equitativas\nCooperación internacional", odsNumbers: [5, 10, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_3.png', color: SECTION_COLORS.institutions },
  { id: 64, text: "Transparencia\nEducación ambiental\nInnovación global", odsNumbers: [4, 9, 12, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_4.png', color: SECTION_COLORS.institutions },
  { id: 65, text: "Derechos humanos\nParticipación ciudadana\nCooperación internacional", odsNumbers: [5, 10, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_5.png', color: SECTION_COLORS.institutions },
  { id: 66, text: "Gobernanza\nIntercambio científico\nFinanciamiento sostenible", odsNumbers: [8, 9, 10, 12, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_6.png', color: SECTION_COLORS.institutions },
  { id: 67, text: "Transparencia\nParticipación política\nInnovación global", odsNumbers: [5, 9, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_7.png', color: SECTION_COLORS.institutions },
  { id: 68, text: "Derechos humanos\nCooperación internacional\nGobernanza", odsNumbers: [5, 10, 13, 16, 17], section: 'institutions', sectionIndex: 7, image: 'FPJIS_8.png', color: SECTION_COLORS.institutions },

  // Comodines - Funcionan con ambos anillos y todas las secciones (8 comodines total)
  { id: 69, text: "COMODÍN\nDesarrollo Sostenible Universal", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_1.png', color: '#FFD700' },
  { id: 70, text: "COMODÍN\nObjetivos Integrados de Sostenibilidad", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_2.png', color: '#FFD700' },
  { id: 71, text: "COMODÍN\nCooperación Global para el Desarrollo", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_3.png', color: '#FFD700' },
  { id: 72, text: "COMODÍN\nTransformación Sostenible Mundial", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_4.png', color: '#FFD700' },
  { id: 73, text: "COMODÍN\nSoluciones Innovadoras Globales", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_5.png', color: '#FFD700' },
  { id: 74, text: "COMODÍN\nAlianzas para el Cambio Sostenible", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_6.png', color: '#FFD700' },
  { id: 75, text: "COMODÍN\nFuturo Sostenible Compartido", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_7.png', color: '#FFD700' },
  { id: 76, text: "COMODÍN\nImpacto Positivo Mundial", odsNumbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], section: 'wildcard', sectionIndex: -1, isWildcard: true, image: 'wildcard_8.png', color: '#FFD700' }
];

function shuffledDeck() {
  const deck = [...CARDS_DATA];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ====== Lobbies ======
const lobbies = new Map();
let nextLobbyId = 1;

function createLobby() {
  const id = nextLobbyId++;
  const lobby = {
    id,
    players: [],           // { id, name, ready, hand: [], hasDrawn:false, hasSkipped:false }
    countdown: null,
    countdownTick: null,
    gameStarted: false,
    gameEnded: false,      // Nueva bandera para juegos terminados
    deck: [],
    discardCount: 0,
    playedCards: [],       // [{ playerId, playerName, card }]
    currentTurn: 0,
    phase: 'awaitRoll',    // 'awaitRoll'|'awaitSpin'|'play'|'verifying'
    diceValue: null,
    // Resultado de ruleta
    selectedMode: null,           // 'inner' | 'outer'
    selectedOuterIndex: null,     // 0..7 (índice de sector)
    selectedOuterCategory: null,  // string ('energy', etc.)
    selectedInnerNumber: null,    // 1..17
    turnFlags: new Map(),         // playerId -> { drawn, skipped }
    // Control de secciones usadas por ciclo
    usedOuterSections: new Set(), // Secciones del anillo exterior ya seleccionadas
    usedInnerNumbers: new Set(),  // Números del anillo interior ya seleccionados
    lastPlayerWithNoCards: null,  // ID del jugador que bajó su última carta
    winConditionMet: false        // Si se cumplió condición de victoria
  };
  lobbies.set(id, lobby);
  return lobby;
}

function getAvailableLobby() {
  for (const lobby of lobbies.values()) {
    // Solo unir a lobbies que no hayan empezado Y que no tengan juego terminado
    if (!lobby.gameStarted && !lobby.gameEnded && lobby.players.length < MAX_PLAYERS) {
      return lobby;
    }
  }
  return createLobby();
}

function removeLobbyIfEmpty(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (lobby && lobby.players.length === 0) {
    if (lobby.countdown) clearInterval(lobby.countdown);
    if (lobby.countdownTick) clearInterval(lobby.countdownTick);
    lobbies.delete(lobbyId);
  }
}

function broadcastLobbyUpdate(lobby, msg = '') {
  io.to(roomId(lobby)).emit('lobby:update', {
    players: lobby.players.map(p => ({ id: p.id, name: p.name, ready: !!p.ready })),
    msg
  });
}

function startCountdown(lobby) {
  cancelCountdown(lobby);
  let remaining = COUNTDOWN_SECONDS;
  lobby.countdownTick = setInterval(() => {
    io.to(roomId(lobby)).emit('lobby:countdown', { count: remaining });
    remaining--;
    if (remaining < 0) {
      clearInterval(lobby.countdownTick);
      lobby.countdownTick = null;
      startGame(lobby);
    }
  }, 1000);
  lobby.countdown = true;
}

function cancelCountdown(lobby) {
  if (!lobby) return;
  if (lobby.countdownTick) {
    clearInterval(lobby.countdownTick);
    lobby.countdownTick = null;
  }
  if (lobby.countdown) {
    lobby.countdown = null;
    io.to(roomId(lobby)).emit('lobby:countdownCanceled');
  }
}

function roomId(lobby) {
  return `lobby_${lobby.id}`;
}

// ====== Juego ======
function dealInitialHands(lobby) {
  lobby.players.forEach(p => {
    p.hand = lobby.deck.splice(0, INITIAL_HAND);
    p.hasDrawn = false;
    p.hasSkipped = false;
  });
}

function resetTurnFlags(lobby) {
  lobby.turnFlags.clear();
  lobby.players.forEach(p => lobby.turnFlags.set(p.id, { drawn: false, skipped: false }));
}

function broadcastGameState(lobby) {
  io.to(roomId(lobby)).emit('game:state', {
    players: lobby.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      cardCount: p.hand.length,
      isActive: idx === lobby.currentTurn
    })),
    currentTurn: lobby.currentTurn,
    phase: lobby.phase,
    diceValue: lobby.diceValue,
    // Resultado actual de ruleta (para UI/depuración)
    wheel: {
      mode: lobby.selectedMode,
      outerIndex: lobby.selectedOuterIndex,
      outerCategory: lobby.selectedOuterCategory,
      innerNumber: lobby.selectedInnerNumber
    },
    deckCount: lobby.deck.length
  });
}

function sendHands(lobby) {
  lobby.players.forEach(p => {
    io.to(p.id).emit('game:myHand', { hand: p.hand });
  });
}

function nextTurn(lobby) {
  lobby.phase = 'awaitRoll';
  lobby.diceValue = null;
  lobby.selectedMode = null;
  lobby.selectedOuterIndex = null;
  lobby.selectedOuterCategory = null;
  lobby.selectedInnerNumber = null;
  lobby.playedCards = [];
  lobby.currentTurn = (lobby.currentTurn + 1) % lobby.players.length;
  
  // Desbloquear jugadores que estaban bloqueados por falta de cartas en el mazo
  const unblockedPlayers = [];
  lobby.players.forEach(player => {
    if (player.blockedUntilNextTurn) {
      delete player.blockedUntilNextTurn;
      unblockedPlayers.push(player.name);
    }
  });
  
  // Notificar si hay jugadores desbloqueados
  if (unblockedPlayers.length > 0) {
    io.to(roomId(lobby)).emit('game:playersUnblocked', {
      players: unblockedPlayers,
      message: `${unblockedPlayers.join(', ')} ya pueden jugar de nuevo`
    });
  }
  
  io.to(roomId(lobby)).emit('game:nextTurn');
  broadcastGameState(lobby);
}

function endGame(lobby, winnerName, reason = 'BASTA!') {
  io.to(roomId(lobby)).emit('game:ended', { winner: winnerName, reason });
  
  // Marcar el lobby como terminado y limpiar estado
  lobby.gameStarted = false;
  lobby.gameEnded = true; // Nueva bandera para indicar juego terminado
  lobby.phase = 'awaitRoll';
  lobby.diceValue = null;
  lobby.playedCards = [];
  lobby.deck = [];
  lobby.discardCount = 0;
  lobby.selectedMode = null;
  lobby.selectedOuterIndex = null;
  lobby.selectedOuterCategory = null;
  lobby.selectedInnerNumber = null;
  
  // Resetear estado de jugadores pero marcarlos como ganadores/perdedores
  lobby.players.forEach(player => {
    player.ready = false;
    player.hand = [];
    player.hasDrawn = false;
    player.hasSkipped = false;
    player.gameFinished = true; // Marcar que terminó el juego
  });
}

function isCardValid(card, lobby) {
  // Los comodines siempre son válidos
  if (card.isWildcard) {
    return true;
  }
  
  if (lobby.selectedMode === 'outer' && typeof lobby.selectedOuterIndex === 'number') {
    // Validar por sección seleccionada en la ruleta exterior
    const targetSection = OUTER_RING_ORDER[lobby.selectedOuterIndex];
    return card.section === targetSection;
  }
  if (lobby.selectedMode === 'inner' && typeof lobby.selectedInnerNumber === 'number') {
    // Validar por número ODS del anillo interior
    return card.odsNumbers && card.odsNumbers.includes(lobby.selectedInnerNumber);
  }
  return false;
}

function startGame(lobby) {
  if (lobby.gameStarted) return;
  if (lobby.players.length < MIN_PLAYERS_TO_START) {
    broadcastLobbyUpdate(lobby, 'Se necesitan al menos 2 jugadores.');
    return;
  }
  cancelCountdown(lobby);

  lobby.gameStarted = true;
  lobby.deck = shuffledDeck();
  lobby.discardCount = 0;
  lobby.playedCards = [];
  lobby.currentTurn = 0;
  lobby.phase = 'awaitRoll';
  lobby.diceValue = null;
  lobby.selectedMode = null;
  lobby.selectedOuterIndex = null;
  lobby.selectedOuterCategory = null;
  lobby.selectedInnerNumber = null;

  resetTurnFlags(lobby);
  dealInitialHands(lobby);

  io.to(roomId(lobby)).emit('game:start');
  sendHands(lobby);
  broadcastGameState(lobby);
}

// ====== SOCKET.IO ======
io.on('connection', (socket) => {
  let currentLobby = null;
  let player = null;

  // Lobby: listo para jugar
  socket.on('lobby:join', ({ name }) => {
    const safeName = String(name || '').trim().substring(0, 18) || 'Jugador';
    currentLobby = getAvailableLobby();
    socket.join(roomId(currentLobby));

    player = {
      id: socket.id,
      name: safeName,
      ready: false,
      hand: [],
      hasDrawn: false,
      hasSkipped: false
    };
    currentLobby.players.push(player);

    broadcastLobbyUpdate(currentLobby, `Jugadores conectados. Cada uno debe hacer clic en "¡Listo!" para comenzar.`);
  });

  socket.on('lobby:ready', () => {
    if (!currentLobby || !player) return;
    
    player.ready = true;
    broadcastLobbyUpdate(currentLobby, `Esperando que todos los jugadores estén listos...`);

    const allReady = currentLobby.players.length >= MIN_PLAYERS_TO_START &&
                     currentLobby.players.length <= MAX_PLAYERS &&
                     currentLobby.players.every(p => p.ready);
    if (allReady) startCountdown(currentLobby);
  });

  // Cancelar (salir del lobby)
  socket.on('lobby:cancel', () => {
    if (!currentLobby || !player) return;
    cancelCountdown(currentLobby);

    currentLobby.players = currentLobby.players.filter(p => p.id !== socket.id);
    socket.leave(roomId(currentLobby));
    broadcastLobbyUpdate(currentLobby, 'Esperando jugadores...');

    removeLobbyIfEmpty(currentLobby.id);
    currentLobby = null;
    player = null;
  });

  // Chat
  socket.on('chat:message', ({ text }) => {
    if (!currentLobby || !player) return;
    io.to(roomId(currentLobby)).emit('chat:message', { playerName: player.name, text: String(text || '').slice(0, 200) });
  });

  // Pedido de mano (reintentos del cliente)
  socket.on('game:requestHand', () => {
    if (!currentLobby || !player) return;
    const me = currentLobby.players.find(p => p.id === socket.id);
    if (!me) return;
    io.to(socket.id).emit('game:myHand', { hand: me.hand || [] });
  });

  // Tirar dado -> define si es inner u outer
  socket.on('game:rollDice', () => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;
    if (!lobby.gameStarted) return;
    if (lobby.players[lobby.currentTurn]?.id !== socket.id) return;
    if (lobby.phase !== 'awaitRoll') return;

    const value = (Math.floor(Math.random() * 6) + 1);
    lobby.diceValue = value;
    lobby.selectedMode = value <= 4 ? 'inner' : 'outer';
    lobby.phase = 'awaitSpin';

    io.to(roomId(lobby)).emit('game:diceRolled', { value, mode: lobby.selectedMode });
    broadcastGameState(lobby);
  });

  // Girar ruleta -> selecciona categoría (outer) o número (inner)
  socket.on('game:spinWheel', () => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;
    if (lobby.players[lobby.currentTurn]?.id !== socket.id) return;
    if (lobby.phase !== 'awaitSpin') return;

    // Más giros: entre 5 y 8 vueltas completas + rotación aleatoria
    const baseRotations = Math.floor(Math.random() * 4) + 5; // 5-8 vueltas
    const extraRotation = Math.floor(Math.random() * 360);
    const rotation = 360 * baseRotations + extraRotation;
    
    io.to(roomId(lobby)).emit('game:wheelSpinning', { rotation });

    setTimeout(() => {
      if (lobby.selectedMode === 'outer') {
        // Usar la misma lógica que el cliente para consistencia
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const sectorDeg = 360 / OUTER_SECTORS;
        const idx = Math.floor(normalizedRotation / sectorDeg) % OUTER_SECTORS;
        
        const selectedCategory = OUTER_RING_ORDER[idx];
        
        // Verificar si esta sección ya fue seleccionada en este ciclo
        if (lobby.usedOuterSections.has(selectedCategory)) {
          // Sección repetida - enviar mensaje de error
          io.to(roomId(lobby)).emit('game:sectionRepeated', {
            message: 'Selección repetida, vuelve a girar',
            sectionName: OUTER_SECTION_NAMES[selectedCategory] || `Sección ${idx + 1}`
          });
          
          // Volver a fase de espera de giro
          lobby.phase = 'awaitSpin';
          broadcastGameState(lobby);
          return;
        }
        
        // Sección válida - registrar uso
        lobby.usedOuterSections.add(selectedCategory);
        lobby.selectedOuterIndex = idx;
        lobby.selectedOuterCategory = selectedCategory;
        lobby.selectedInnerNumber = null;
        
        // Si ya se usaron todas las secciones, resetear para el próximo ciclo
        if (lobby.usedOuterSections.size >= OUTER_SECTORS) {
          lobby.usedOuterSections.clear();
        }
        
        // Nombres de secciones en español para mostrar al usuario
        const outerSectionName = OUTER_SECTION_NAMES[selectedCategory] || `Sección ${idx + 1}`;
        
        // Definir colores para cada sección del anillo exterior
        const outerColors = [
          'hsl(0, 60%, 70%)',      // rojo pastel
          'hsl(45, 60%, 70%)',     // amarillo pastel
          'hsl(90, 60%, 70%)',     // verde lima pastel
          'hsl(135, 60%, 70%)',    // verde menta pastel
          'hsl(180, 60%, 70%)',    // cian pastel
          'hsl(225, 60%, 70%)',    // azul pastel
          'hsl(270, 60%, 70%)',    // violeta pastel
          'hsl(315, 60%, 70%)'     // rosa pastel
        ];
        
        io.to(roomId(lobby)).emit('game:wheelResult', {
          mode: 'outer',
          outerIndex: idx,
          outerCategory: selectedCategory,
          sectionName: outerSectionName,
          sectionColor: outerColors[idx] || 'hsl(0, 60%, 70%)'
        });
      } else {
        // Usar la misma lógica que el cliente para el anillo interior
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const sectorDeg = 360 / INNER_SECTORS;
        const idx = Math.floor(normalizedRotation / sectorDeg) % INNER_SECTORS;
        
        const selectedNumber = (idx + 1); // 1..17
        
        // Verificar si este número ya fue seleccionado en este ciclo
        if (lobby.usedInnerNumbers.has(selectedNumber)) {
          // Número repetido - enviar mensaje de error
          io.to(roomId(lobby)).emit('game:sectionRepeated', {
            message: 'Selección repetida, vuelve a girar',
            sectionName: INNER_SECTION_NAMES[selectedNumber] || `ODS ${selectedNumber}`
          });
          
          // Volver a fase de espera de giro
          lobby.phase = 'awaitSpin';
          broadcastGameState(lobby);
          return;
        }
        
        // Número válido - registrar uso
        lobby.usedInnerNumbers.add(selectedNumber);
        lobby.selectedInnerNumber = selectedNumber;
        lobby.selectedOuterIndex = null;
        lobby.selectedOuterCategory = null;
        
        // Si ya se usaron todos los números, resetear para el próximo ciclo
        if (lobby.usedInnerNumbers.size >= INNER_SECTORS) {
          lobby.usedInnerNumbers.clear();
        }
        
        const innerSectionName = INNER_SECTION_NAMES[selectedNumber] || `ODS ${selectedNumber}`;
        
        // Definir colores para cada número del anillo interior (variación por número)
        const innerColors = [
          'hsl(0,70%,50%)', 'hsl(21,70%,50%)', 'hsl(42,70%,50%)', 'hsl(64,70%,50%)', 
          'hsl(85,70%,50%)', 'hsl(106,70%,50%)', 'hsl(127,70%,50%)', 'hsl(148,70%,50%)', 
          'hsl(169,70%,50%)', 'hsl(191,70%,50%)', 'hsl(212,70%,50%)', 'hsl(233,70%,50%)', 
          'hsl(254,70%,50%)', 'hsl(275,70%,50%)', 'hsl(296,70%,50%)', 'hsl(318,70%,50%)', 
          'hsl(339,70%,50%)'
        ];
        
        io.to(roomId(lobby)).emit('game:wheelResult', {
          mode: 'inner',
          innerNumber: selectedNumber,
          sectionName: innerSectionName,
          sectionColor: innerColors[selectedNumber - 1] || 'hsl(0,70%,50%)'
        });
      }
      lobby.phase = 'play';
      resetTurnFlags(lobby);
      io.to(roomId(lobby)).emit('turn:play');
      broadcastGameState(lobby);
    }, 2800); // Aumentar tiempo para giros más largos
  });

  // Jugar carta
  socket.on('game:playCard', ({ cardId }) => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;
    if (lobby.phase !== 'play') return;

    const pl = lobby.players.find(p => p.id === socket.id);
    if (!pl) return;

    // Verificar si el jugador está bloqueado por sanción
    if (pl.blockedUntilNextTurn) {
      socket.emit('game:error', {
        message: 'No puedes jugar cartas este turno debido a una sanción pendiente'
      });
      return;
    }

    const idx = pl.hand.findIndex(c => c.id === Number(cardId));
    if (idx === -1) return;

    const [card] = pl.hand.splice(idx, 1);
    lobby.playedCards.push({ playerId: pl.id, playerName: pl.name, card });

    // Verificar si el jugador se quedó sin cartas
    if (pl.hand.length === 0) {
      lobby.lastPlayerWithNoCards = pl.id;
      io.to(roomId(lobby)).emit('game:playerEmptyHand', {
        playerId: pl.id,
        playerName: pl.name,
        message: `${pl.name} bajó su última carta! Debe presionar la campana para ganar.`
      });
    }

    io.to(roomId(lobby)).emit('game:cardPlayed', {
      playerId: pl.id,
      playerName: pl.name,
      cardId: card.id,
      cardImage: card.image,
      cardText: card.text,
      section: card.section,
      odsNumbers: card.odsNumbers,
      color: card.color,
      sectionIndex: card.sectionIndex,
      isWildcard: card.isWildcard || false
    });

    // Actualizar mi mano
    io.to(pl.id).emit('game:myHand', { hand: pl.hand });
    broadcastGameState(lobby);
  });

  // Robar carta (1 por fase de juego)
  socket.on('game:drawCard', () => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;
    if (lobby.phase !== 'play') return;

    const flags = lobby.turnFlags.get(socket.id) || { drawn: false, skipped: false };
    if (flags.drawn) return;

    const pl = lobby.players.find(p => p.id === socket.id);
    if (!pl) return;

    const top = lobby.deck.pop();
    if (top) {
      pl.hand.push(top);
      flags.drawn = true;
      lobby.turnFlags.set(socket.id, flags);
      io.to(roomId(lobby)).emit('game:cardDrawn', { playerId: pl.id, playerName: pl.name });
      io.to(pl.id).emit('game:myHand', { hand: pl.hand });
      broadcastGameState(lobby);
    }
  });

  // Pasar turno (1 por fase de juego)
  socket.on('game:skipTurn', () => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;
    if (lobby.phase !== 'play') return;

    const flags = lobby.turnFlags.get(socket.id) || { drawn: false, skipped: false };
    if (flags.skipped) return;

    const pl = lobby.players.find(p => p.id === socket.id);
    if (!pl) return;

    flags.skipped = true;
    lobby.turnFlags.set(socket.id, flags);
    io.to(roomId(lobby)).emit('game:playerSkipped', { playerId: pl.id, playerName: pl.name });

    const allSkipped = lobby.players.every(p => (lobby.turnFlags.get(p.id) || {}).skipped);
    if (allSkipped) {
      io.to(roomId(lobby)).emit('game:allSkipped');
      nextTurn(lobby);
    } else {
      broadcastGameState(lobby);
    }
  });

  // Tocar campana -> verificar, devolver inválidas, sancionar y anunciar
  socket.on('game:endTurn', () => {
    if (!currentLobby) return;
    const lobby = currentLobby;
    if (lobby.phase !== 'play') return;

    const ringer = lobby.players.find(p => p.id === socket.id);
    
    // Marcar quién tocó la campana para verificar victoria después
    lobby.bellRinger = socket.id;
    
    // Si hay un jugador sin cartas y otro jugador presionó la campana - SANCIÓN inmediata
    if (lobby.lastPlayerWithNoCards && socket.id !== lobby.lastPlayerWithNoCards) {
      const playerWithNoCards = lobby.players.find(p => p.id === lobby.lastPlayerWithNoCards);
      
      if (playerWithNoCards) {
        // Devolver carta si la jugó
        if (lobby.playedCards.length > 0) {
          const lastPlayedCard = lobby.playedCards.find(pc => pc.playerId === lobby.lastPlayerWithNoCards);
          if (lastPlayedCard) {
            // Devolver la carta
            playerWithNoCards.hand.push(lastPlayedCard.card);
            // Remover de cartas jugadas
            lobby.playedCards = lobby.playedCards.filter(pc => pc !== lastPlayedCard);
          }
        }
        
        // NUEVA REGLA: Sanción de 2 cartas si hay cartas disponibles
        let penaltyCardsGiven = 0;
        for (let i = 0; i < 2 && lobby.deck.length > 0; i++) {
          const penaltyCard = lobby.deck.pop();
          if (penaltyCard) {
            playerWithNoCards.hand.push(penaltyCard);
            penaltyCardsGiven++;
          }
        }
        
        // Si no hay suficientes cartas, marcar para bloqueo
        if (penaltyCardsGiven < 2) {
          playerWithNoCards.blockedUntilNextTurn = true;
        }
        
        // Resetear estado
        lobby.lastPlayerWithNoCards = null;
        
        io.to(roomId(lobby)).emit('game:bellPenalty', {
          penalizedPlayer: playerWithNoCards.name,
          ringerPlayer: ringer.name,
          penaltyCards: penaltyCardsGiven,
          blocked: penaltyCardsGiven < 2,
          message: `${playerWithNoCards.name} recibió ${penaltyCardsGiven} cartas de sanción por no presionar la campana a tiempo`
        });
        
        // Actualizar mano del penalizado
        io.to(playerWithNoCards.id).emit('game:myHand', { hand: playerWithNoCards.hand });
      }
    }

    lobby.phase = 'verifying';
    broadcastGameState(lobby);

    io.to(roomId(lobby)).emit('game:bellRang', {
      playerId: socket.id,
      playerName: ringer ? ringer.name : 'Jugador'
    });

    // Mostrar mensaje de verificación
    io.to(roomId(lobby)).emit('game:verifyingMessage', {
      message: 'Verificando cartas...'
    });

    // 1) Veredicto por carta
    const played = (lobby.playedCards || []).map(({ playerId, playerName, card }) => {
      const valid = isCardValid(card, lobby);
      const reason = valid ? null : (lobby.selectedMode === 'inner' ? 'wrongNumber' : 'wrongSection');
      return {
        cardId: card.id,
        playerId,
        playerName,
        valid,
        reason,
        cardImage: card.image,
        cardText: card.text,
        section: card.section,
        odsNumbers: card.odsNumbers,
        color: card.color,
        sectionIndex: card.sectionIndex,
        isWildcard: card.isWildcard || false
      };
    });

    // 2) Efectos: válidas a descarte, inválidas regresan + sanción  
    const invalidByPlayer = new Map(); // playerId -> { playerId, playerName, hasInvalidCards }
    
    // Primero: procesar todas las cartas y determinar qué jugadores tienen cartas inválidas
    for (const p of played) {
      const pc = (lobby.playedCards || []).find(x => x.card.id === p.cardId);
      const pl = lobby.players.find(u => u.id === p.playerId);
      if (!pc || !pl) continue;

      if (p.valid) {
        lobby.discardCount += 1;
      } else {
        // Devolver la carta inválida
        pl.hand.push(pc.card);

        // Marcar que este jugador tiene al menos una carta inválida
        if (!invalidByPlayer.has(pl.id)) {
          invalidByPlayer.set(pl.id, { 
            playerId: pl.id, 
            playerName: pl.name, 
            drawCount: 0,
            hasInvalidCards: true 
          });
        }
      }
    }

    // 2.5) Aplicar sanciones: EXACTAMENTE 1 carta por jugador que tenga cartas inválidas
    const playersToBlock = []; // Para jugadores que no pueden recibir cartas
    
    console.log(`[SANCION] Jugadores con cartas inválidas: ${invalidByPlayer.size}`);
    
    for (const [playerId, reg] of invalidByPlayer) {
      const player = lobby.players.find(p => p.id === playerId);
      if (!player) continue;
      
      console.log(`[SANCION] Procesando jugador: ${reg.playerName}`);
      
      // NUEVA REGLA: Solo 1 carta de sanción por jugador, sin importar cuántas cartas inválidas tenga
      if (lobby.deck.length > 0) {
        const penaltyCard = lobby.deck.pop();
        if (penaltyCard) {
          player.hand.push(penaltyCard);
          reg.drawCount = 1; // Exactamente 1 carta de sanción
          console.log(`[SANCION] ${reg.playerName} recibió 1 carta de sanción`);
        }
      } else {
        // Si no hay cartas en el mazo, marcar para bloqueo en siguiente turno
        playersToBlock.push(playerId);
        player.blockedUntilNextTurn = true;
        reg.drawCount = 0; // No recibió cartas pero será bloqueado
        console.log(`[SANCION] ${reg.playerName} será bloqueado (sin cartas en mazo)`);
      }
    }

    // 3) Limpiar jugadas y sincronizar manos
    lobby.playedCards = [];
    sendHands(lobby);
    broadcastGameState(lobby);

    // 4) Mensaje global de penalización
    let penaltyMessage = '';
    const invalidList = Array.from(invalidByPlayer.values());
    const blockedPlayerNames = playersToBlock.map(id => {
      const p = lobby.players.find(pl => pl.id === id);
      return p ? p.name : '';
    }).filter(name => name);
    
    if (invalidList.length > 0) {
      const namesWithCards = invalidList.filter(x => x.drawCount > 0).map(x => x.playerName);
      
      if (namesWithCards.length > 0) {
        // Seleccionar mensaje aleatorio de sanción para jugadores que recibieron cartas
        const randomPenalty = PENALTY_MESSAGES[Math.floor(Math.random() * PENALTY_MESSAGES.length)];
        const isPlural = namesWithCards.length > 1;
        const suffix = isPlural ? randomPenalty.plural : randomPenalty.singular;
        
        penaltyMessage = `${namesWithCards.join(', ')} ${suffix}`;
      }
      
      // Mensaje adicional para jugadores bloqueados
      if (blockedPlayerNames.length > 0) {
        const blockMessage = `${blockedPlayerNames.join(', ')} no podrán jugar el siguiente turno (sin cartas en el mazo)`;
        penaltyMessage = penaltyMessage ? `${penaltyMessage}. ${blockMessage}` : blockMessage;
      }
      
      io.to(roomId(lobby)).emit('game:penaltyAnnouncement', {
        names: invalidList.map(x => x.playerName),
        blockedPlayers: blockedPlayerNames,
        message: penaltyMessage,
        hasBlocked: blockedPlayerNames.length > 0
      });
    }

    // 5) Resultado para animaciones del cliente
    io.to(roomId(lobby)).emit('game:verifyResult', {
      played,                        // cartas con valid=true/false y dueños
      invalidPlayers: invalidList,   // { playerId, playerName, drawCount }
      penaltyMessage,                // texto listo
      mode: lobby.selectedMode,      // 'inner' | 'outer'
      target: {
        outerIndex: lobby.selectedOuterIndex,
        outerCategory: lobby.selectedOuterCategory,
        innerNumber: lobby.selectedInnerNumber
      },
      deckCount: lobby.deck.length
    });

    // 6) Verificar condición de victoria DESPUÉS de validar cartas
    let victoryResolved = false;
    
    // Si el jugador que tocó la campana era el que no tenía cartas, verificar su carta
    if (lobby.lastPlayerWithNoCards && lobby.bellRinger === lobby.lastPlayerWithNoCards) {
      const playerWithNoCards = lobby.players.find(p => p.id === lobby.lastPlayerWithNoCards);
      
      if (playerWithNoCards) {
        // Buscar la carta jugada por el jugador sin cartas
        const playerCard = played.find(p => p.playerId === lobby.lastPlayerWithNoCards);
        
        if (playerCard) {
          if (playerCard.valid) {
            // CRUCIAL: Verificar que el jugador AÚN tenga 0 cartas después del proceso de verificación
            if (playerWithNoCards.hand.length === 0) {
              // Carta válida Y jugador sin cartas - ¡VICTORIA!
              victoryResolved = true;
              
              setTimeout(() => {
                io.to(roomId(lobby)).emit('game:bastaWin', {
                  winner: playerWithNoCards.name,
                  message: '¡BASTA!'
                });
                endGame(lobby, playerWithNoCards.name, '¡BASTA!');
              }, 2000); // Esperar 2 segundos para mostrar verificación primero
              
              return; // Terminar aquí, no continuar el juego
            } else {
              // Carta válida pero el jugador ya no tiene 0 cartas (no debería pasar, pero por seguridad)
              lobby.lastPlayerWithNoCards = null;
            }
          } else {
            // Carta inválida - el jugador pierde su oportunidad de victoria
            // Su carta ya fue devuelta y sancionada en el proceso de verificación
            // IMPORTANTE: El jugador ya no tiene 0 cartas, resetear estado
            lobby.lastPlayerWithNoCards = null;
            
            // Mensaje especial para esta situación
            setTimeout(() => {
              io.to(roomId(lobby)).emit('game:victoryFailed', {
                player: playerWithNoCards.name,
                message: `${playerWithNoCards.name} perdió la oportunidad de ganar por carta inválida`
              });
            }, 2000);
          }
        } else {
          // El jugador no jugó carta - resetear estado
          lobby.lastPlayerWithNoCards = null;
        }
      }
    }
    
    // Resetear variables de campana
    lobby.bellRinger = null;

    // 7) Esperar confirmación y avanzar turno
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      
      if (!victoryResolved) {
        io.to(roomId(lobby)).emit('game:nextTurn');
        nextTurn(lobby);
      }
    };

    const onVerifyDone = () => {
      socket.off('game:verifyDone', onVerifyDone);
      finish();
    };

    socket.on('game:verifyDone', onVerifyDone);
    setTimeout(() => {
      socket.off('game:verifyDone', onVerifyDone);
      finish();
    }, 4500);
  });

  // Señalización de voz (relay simple)
  socket.on('voice:join', () => {
    console.log(`🎙️ Usuario ${socket.id} (${playerName}) se une al chat de voz en lobby:`, currentLobby);
    if (!currentLobby) {
      console.log('❌ Usuario no está en ningún lobby');
      return;
    }
    socket.to(roomId(currentLobby)).emit('voice:userJoined', { userId: socket.id });
    announceParticipants(currentLobby);
  });

  socket.on('voice:offer', ({ targetId, offer }) => {
    io.to(targetId).emit('voice:offer', { fromId: socket.id, offer });
  });

  socket.on('voice:answer', ({ targetId, answer }) => {
    io.to(targetId).emit('voice:answer', { fromId: socket.id, answer });
  });

  socket.on('voice:iceCandidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('voice:iceCandidate', { fromId: socket.id, candidate });
  });

  // Abandono voluntario de partida
  socket.on('game:leaveGame', () => {
    if (!currentLobby || !player) return;
    const lobby = currentLobby;

    // Notificar abandono
    if (lobby.gameStarted) {
      io.to(roomId(lobby)).emit('game:playerLeft', { 
        playerName: player.name,
        playerId: player.id 
      });
    }

    // Remover jugador del lobby
    const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
    const wasCurrentPlayer = playerIndex === lobby.currentTurn;
    lobby.players = lobby.players.filter(p => p.id !== socket.id);

    // Limpiar referencias
    currentLobby = null;
    player = null;

    // Enviar al cliente de vuelta al lobby
    socket.emit('game:returnToLobby');

    // Ajustar lógica de juego si es necesario
    if (lobby.gameStarted && lobby.players.length > 0) {
      if (lobby.players.length === 1) {
        const winner = lobby.players[0];
        endGame(lobby, winner.name, 'Ganador por abandono');
      } else {
        // Ajustar turno si era el jugador actual
        if (playerIndex < lobby.currentTurn) {
          lobby.currentTurn--;
        } else if (wasCurrentPlayer) {
          // Si era su turno, pasa al siguiente
          if (lobby.currentTurn >= lobby.players.length) {
            lobby.currentTurn = 0;
          }
        }
        broadcastGameState(lobby);
      }
    } else if (!lobby.gameStarted) {
      const canStillStart = lobby.players.length >= MIN_PLAYERS_TO_START &&
        lobby.players.length <= MAX_PLAYERS &&
        lobby.players.every(p => p.ready);
      if (!canStillStart) cancelCountdown(lobby);
      broadcastLobbyUpdate(lobby, 'Esperando jugadores...');
    }

    removeLobbyIfEmpty(lobby.id);
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (!currentLobby) return;
    const lobby = currentLobby;

    // Encontrar el índice del jugador que se desconecta
    const disconnectedPlayerIndex = lobby.players.findIndex(p => p.id === socket.id);
    const wasCurrentPlayer = disconnectedPlayerIndex === lobby.currentTurn;
    const disconnectedPlayer = lobby.players[disconnectedPlayerIndex];

    // Notificar abandono si estaba en juego
    if (lobby.gameStarted && disconnectedPlayer) {
      io.to(roomId(lobby)).emit('game:playerLeft', { 
        playerName: disconnectedPlayer.name,
        playerId: disconnectedPlayer.id 
      });
    }

    lobby.players = lobby.players.filter(p => p.id !== socket.id);

    socket.to(roomId(lobby)).emit('voice:userLeft', { userId: socket.id });
    announceParticipants(lobby);

    if (!lobby.gameStarted) {
      const canStillStart = lobby.players.length >= MIN_PLAYERS_TO_START &&
        lobby.players.length <= MAX_PLAYERS &&
        lobby.players.every(p => p.ready);
      if (!canStillStart) cancelCountdown(lobby);
      broadcastLobbyUpdate(lobby, 'Esperando jugadores...');
    } else {
      if (lobby.players.length === 1) {
        const winner = lobby.players[0];
        endGame(lobby, winner.name, 'Ganador por abandono');
      } else {
        // Ajustar el turno después de la desconexión
        if (disconnectedPlayerIndex < lobby.currentTurn) {
          // Si se desconectó un jugador antes del turno actual, decrementar currentTurn
          lobby.currentTurn--;
        } else if (wasCurrentPlayer) {
          // Si se desconectó el jugador del turno actual, mantener currentTurn pero ajustar si excede
          // No necesitamos incrementar porque automáticamente apunta al siguiente jugador
        }

        // Asegurar que currentTurn esté dentro del rango válido
        if (lobby.currentTurn >= lobby.players.length) {
          lobby.currentTurn = 0;
        }

        broadcastGameState(lobby);
      }
    }

    removeLobbyIfEmpty(lobby.id);
  });
});

// Participantes de voz (conteo básico por lobby)
function announceParticipants(lobby) {
  const users = lobby.players.map(p => ({ id: p.id, name: p.name }));
  console.log(`👥 Anunciando participantes en lobby ${lobby.id}:`, users.length, 'usuarios:', users.map(u => u.name));
  io.to(roomId(lobby)).emit('voice:participants', { count: users.length, users });
}

// ====== HTTP ======
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Acepta conexiones desde cualquier IP
server.listen(PORT, HOST, () => {
  console.log(`Servidor BASTA escuchando en:`);
  console.log(`  - Local:    http://localhost:${PORT}`);
  console.log(`  - Red:      http://192.168.1.13:${PORT}`);
  console.log(`  - Cualquier IP: http://${HOST}:${PORT}`);
});