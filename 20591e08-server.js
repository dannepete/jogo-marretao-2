'use strict';
/**
 * C&C (Caçadores e Corredores) - Backend
 * Node.js + Express + Socket.io. Todo o estado vive em memória.
 */
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 25000
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.send('ok'));

/* ------------------------------ Configuração ------------------------------ */
const CFG = {
  PORT: process.env.PORT || 3000,
  MAX_NAME: 15,
  MIN_PLAYERS: 2,
  MATRIX_TARGET: 25,
  COMPUTERS: ['X', 'Y', 'Z', 'K'],
  CAPSULES: [1, 2, 3],
  FREEZE_SECONDS: 60,
  FREEZE_GRACE: 5,
  HUNTER_WAIT: 30,
  ROULETTE_MS: 3200,          // 2s de roleta + 1,2s a mostrar a função (igual no cliente)
  HACK_COOLDOWN_MS: 180000,   // 3 minutos
  MIN_HACK_MS: 8000           // anti-cheat: duração mínima plausível de um hackeio
};

/* ------------------------- Banco de perguntas (115) ------------------------ */
// Formato: [pergunta, [resposta correta, errada, errada, errada]]
const RAW_QUESTIONS = [
  ['Qual é a capital de Portugal?', ['Lisboa', 'Porto', 'Coimbra', 'Faro']],
  ['Quantos continentes existem (no modelo mais comum)?', ['7', '5', '6', '8']],
  ['Qual é o maior oceano do mundo?', ['Pacífico', 'Atlântico', 'Índico', 'Árctico']],
  ['Quem escreveu "Os Lusíadas"?', ['Luís de Camões', 'Fernando Pessoa', 'Eça de Queirós', 'José Saramago']],
  ['Qual é o planeta mais próximo do Sol?', ['Mercúrio', 'Vénus', 'Marte', 'Terra']],
  ['Quantos lados tem um hexágono?', ['6', '5', '7', '8']],
  ['Qual é a fórmula química da água?', ['H2O', 'CO2', 'O2', 'NaCl']],
  ['Em que ano o ser humano chegou à Lua pela primeira vez?', ['1969', '1959', '1972', '1981']],
  ['Qual é o maior planeta do Sistema Solar?', ['Júpiter', 'Saturno', 'Neptuno', 'Terra']],
  ['Qual é o rio mais extenso da Península Ibérica?', ['Tejo', 'Douro', 'Ebro', 'Guadiana']],
  ['Quantos jogadores tem uma equipa de futebol em campo?', ['11', '10', '9', '12']],
  ['Quem pintou a Mona Lisa?', ['Leonardo da Vinci', 'Miguel Ângelo', 'Rafael', 'Van Gogh']],
  ['Quanto é 7 x 8?', ['56', '54', '48', '64']],
  ['Quantos minutos tem uma hora?', ['60', '100', '30', '90']],
  ['Qual é o maior animal terrestre?', ['Elefante-africano', 'Girafa', 'Rinoceronte', 'Hipopótamo']],
  ['Qual é a capital de Espanha?', ['Madrid', 'Barcelona', 'Sevilha', 'Valência']],
  ['Qual é a capital de França?', ['Paris', 'Lyon', 'Marselha', 'Nice']],
  ['Qual é a capital de Itália?', ['Roma', 'Milão', 'Nápoles', 'Florença']],
  ['Qual é a capital da Alemanha?', ['Berlim', 'Munique', 'Hamburgo', 'Frankfurt']],
  ['Qual é a capital do Brasil?', ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador']],
  ['Qual é a capital do Japão?', ['Tóquio', 'Quioto', 'Osaka', 'Nagoia']],
  ['Qual é a capital do Canadá?', ['Ottawa', 'Toronto', 'Vancouver', 'Montreal']],
  ['Qual é a capital da Austrália?', ['Camberra', 'Sydney', 'Melbourne', 'Perth']],
  ['Qual é a capital do Egito?', ['Cairo', 'Alexandria', 'Luxor', 'Gizé']],
  ['Quem descobriu o caminho marítimo para a Índia?', ['Vasco da Gama', 'Pedro Álvares Cabral', 'Bartolomeu Dias', 'Fernão de Magalhães']],
  ['Em que ano Pedro Álvares Cabral chegou ao Brasil?', ['1500', '1492', '1498', '1510']],
  ['Em que ano ocorreu a Revolução dos Cravos?', ['1974', '1968', '1976', '1986']],
  ['Quem foi o primeiro rei de Portugal?', ['D. Afonso Henriques', 'D. Dinis', 'D. João I', 'D. Manuel I']],
  ['Em que ano Colombo chegou à América?', ['1492', '1500', '1453', '1519']],
  ['Qual é o gás mais abundante na atmosfera da Terra?', ['Azoto', 'Oxigénio', 'Dióxido de carbono', 'Árgon']],
  ['Quantos ossos tem o corpo de um humano adulto?', ['206', '180', '230', '300']],
  ['Qual é o órgão que bombeia o sangue pelo corpo?', ['Coração', 'Fígado', 'Pulmão', 'Rim']],
  ['Qual é a velocidade aproximada da luz no vácuo?', ['300 000 km/s', '150 000 km/s', '30 000 km/s', '3 000 000 km/s']],
  ['Qual é o único metal líquido à temperatura ambiente?', ['Mercúrio', 'Ferro', 'Alumínio', 'Cobre']],
  ['Qual é o símbolo químico do ouro?', ['Au', 'Ag', 'Go', 'Or']],
  ['Qual é o símbolo químico da prata?', ['Ag', 'Au', 'Pr', 'Si']],
  ['Qual é o símbolo químico do sódio?', ['Na', 'S', 'So', 'Sd']],
  ['Que planeta é conhecido como "planeta vermelho"?', ['Marte', 'Vénus', 'Júpiter', 'Mercúrio']],
  ['Quantos planetas tem o Sistema Solar?', ['8', '9', '7', '10']],
  ['Qual é o maior país do mundo em área?', ['Rússia', 'Canadá', 'China', 'Estados Unidos']],
  ['Qual é o menor país do mundo?', ['Vaticano', 'Mónaco', 'San Marino', 'Liechtenstein']],
  ['Qual é o maior deserto quente do mundo?', ['Sara', 'Gobi', 'Kalahari', 'Atacama']],
  ['Qual é a montanha mais alta do mundo?', ['Evereste', 'K2', 'Monte Branco', 'Kilimanjaro']],
  ['Qual é o rio mais caudaloso do mundo?', ['Amazonas', 'Nilo', 'Mississípi', 'Yangtzé']],
  ['Que oceano separa a Europa da América?', ['Atlântico', 'Pacífico', 'Índico', 'Árctico']],
  ['Qual é o ponto mais alto de Portugal?', ['Montanha do Pico', 'Serra da Estrela', 'Serra do Gerês', 'Serra do Marão']],
  ['Qual é a capital da Madeira?', ['Funchal', 'Machico', 'Porto Santo', 'Câmara de Lobos']],
  ['Quantos dias tem um ano bissexto?', ['366', '365', '364', '367']],
  ['Quantos meses do ano têm pelo menos 28 dias?', ['12', '1', '2', '6']],
  ['Qual é a raiz quadrada de 144?', ['12', '14', '11', '13']],
  ['Quanto é 15 + 27?', ['42', '43', '41', '52']],
  ['Quanto é 100 a dividir por 4?', ['25', '20', '40', '50']],
  ['Quanto é 9 ao quadrado?', ['81', '72', '18', '99']],
  ['Quantos graus tem um ângulo reto?', ['90', '180', '45', '60']],
  ['Quanto soma a amplitude dos ângulos internos de um triângulo?', ['180°', '90°', '360°', '270°']],
  ['Qual é o valor aproximado de pi?', ['3,14', '2,71', '1,62', '3,41']],
  ['Quantos lados tem um octógono?', ['8', '6', '10', '9']],
  ['Quem escreveu "Romeu e Julieta"?', ['William Shakespeare', 'Charles Dickens', 'Miguel de Cervantes', 'Victor Hugo']],
  ['Quem escreveu "Dom Quixote"?', ['Miguel de Cervantes', 'Lope de Vega', 'Luís de Camões', 'Dante Alighieri']],
  ['Quem escreveu "Ensaio sobre a Cegueira"?', ['José Saramago', 'Eça de Queirós', 'António Lobo Antunes', 'Miguel Torga']],
  ['Quem é o autor de "Os Maias"?', ['Eça de Queirós', 'Camilo Castelo Branco', 'Almeida Garrett', 'Aquilino Ribeiro']],
  ['Qual destes é um heterónimo de Fernando Pessoa?', ['Álvaro de Campos', 'Cesário Verde', 'Mário de Sá-Carneiro', 'Sophia de Mello Breyner']],
  ['Quem compôs a Nona Sinfonia?', ['Beethoven', 'Mozart', 'Bach', 'Chopin']],
  ['Quantas cordas tem uma guitarra clássica?', ['6', '4', '5', '8']],
  ['Quantas teclas tem um piano padrão?', ['88', '76', '66', '100']],
  ['Quantas notas musicais existem na escala natural?', ['7', '5', '8', '12']],
  ['Quem pintou "A Noite Estrelada"?', ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí']],
  ['Quem pintou "Guernica"?', ['Pablo Picasso', 'Salvador Dalí', 'Joan Miró', 'Francisco Goya']],
  ['Quantos jogadores de cada equipa estão em campo no basquetebol?', ['5', '6', '7', '11']],
  ['Quantos jogadores de cada equipa estão em campo no voleibol?', ['6', '5', '7', '9']],
  ['De quantos em quantos anos se realizam os Jogos Olímpicos de Verão?', ['4', '2', '3', '5']],
  ['Em que cidade se realizaram os Jogos Olímpicos de 2016?', ['Rio de Janeiro', 'Londres', 'Pequim', 'Tóquio']],
  ['Que seleção ganhou o Campeonato do Mundo de futebol de 2022?', ['Argentina', 'França', 'Brasil', 'Croácia']],
  ['Que seleção ganhou o Campeonato da Europa de futebol de 2016?', ['Portugal', 'França', 'Alemanha', 'Espanha']],
  ['Qual é a distância oficial de uma maratona?', ['42,195 km', '40 km', '45 km', '21,097 km']],
  ['Quantos anéis tem o símbolo olímpico?', ['5', '4', '6', '7']],
  ['Quais são as cores predominantes na bandeira de Portugal?', ['Verde e vermelho', 'Azul e branco', 'Verde e amarelo', 'Vermelho e amarelo']],
  ['Qual é a moeda oficial de Portugal?', ['Euro', 'Escudo', 'Peseta', 'Dólar']],
  ['Qual é a moeda do Japão?', ['Iene', 'Yuan', 'Won', 'Rupia']],
  ['Qual é a moeda do Reino Unido?', ['Libra esterlina', 'Euro', 'Dólar', 'Franco']],
  ['Qual é a língua nativa mais falada no mundo?', ['Mandarim', 'Inglês', 'Espanhol', 'Hindi']],
  ['Qual é a língua oficial do Brasil?', ['Português', 'Espanhol', 'Inglês', 'Francês']],
  ['Quem inventou a lâmpada incandescente comercial?', ['Thomas Edison', 'Nikola Tesla', 'Graham Bell', 'Alexander Fleming']],
  ['Quem descobriu a penicilina?', ['Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Isaac Newton']],
  ['Quem formulou a Teoria da Relatividade?', ['Albert Einstein', 'Isaac Newton', 'Galileu Galilei', 'Niels Bohr']],
  ['Quem formulou a Lei da Gravitação Universal?', ['Isaac Newton', 'Albert Einstein', 'Galileu Galilei', 'Johannes Kepler']],
  ['Quem fundou a Microsoft?', ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Elon Musk']],
  ['O que significa a sigla "www"?', ['World Wide Web', 'World Web Window', 'Wide World Net', 'Web World Wire']],
  ['Quantos bits tem um byte?', ['8', '4', '16', '10']],
  ['O que significa a sigla CPU?', ['Unidade Central de Processamento', 'Unidade de Controlo Portátil', 'Computador Pessoal Universal', 'Central de Processos Úteis']],
  ['Que planeta é famoso pelos seus anéis?', ['Saturno', 'Marte', 'Vénus', 'Mercúrio']],
  ['Como se chama o satélite natural da Terra?', ['Lua', 'Fobos', 'Titã', 'Europa']],
  ['Qual é a estrela mais próxima da Terra?', ['Sol', 'Sirius', 'Estrela Polar', 'Vega']],
  ['A que temperatura congela a água, ao nível do mar?', ['0 °C', '10 °C', '-10 °C', '100 °C']],
  ['A que temperatura ferve a água, ao nível do mar?', ['100 °C', '90 °C', '120 °C', '80 °C']],
  ['Como se chama o processo pelo qual as plantas produzem o seu alimento?', ['Fotossíntese', 'Respiração', 'Digestão', 'Fermentação']],
  ['Que gás as plantas absorvem para a fotossíntese?', ['Dióxido de carbono', 'Oxigénio', 'Azoto', 'Hélio']],
  ['Qual é o maior órgão do corpo humano?', ['Pele', 'Fígado', 'Cérebro', 'Intestino']],
  ['Quantos dentes tem um adulto com dentição completa?', ['32', '28', '30', '36']],
  ['Quantos sentidos tradicionais tem o ser humano?', ['5', '4', '6', '7']],
  ['Qual é o único mamífero capaz de voar?', ['Morcego', 'Pinguim', 'Avestruz', 'Águia']],
  ['Qual é o animal terrestre mais rápido?', ['Chita', 'Leão', 'Cavalo', 'Antílope']],
  ['Qual é o maior mamífero marinho?', ['Baleia-azul', 'Tubarão-baleia', 'Orca', 'Golfinho']],
  ['Quantas patas tem uma aranha?', ['8', '6', '10', '4']],
  ['Quantas patas tem um inseto?', ['6', '8', '4', '10']],
  ['Que cor resulta da mistura de azul com amarelo?', ['Verde', 'Roxo', 'Laranja', 'Castanho']],
  ['Quais são as cores primárias tradicionais (pigmentos)?', ['Vermelho, azul e amarelo', 'Verde, laranja e roxo', 'Preto, branco e cinzento', 'Rosa, verde e azul']],
  ['Que rio atravessa Lisboa?', ['Tejo', 'Douro', 'Mondego', 'Sado']],
  ['Que rio desagua no Porto?', ['Douro', 'Tejo', 'Minho', 'Vouga']],
  ['Que cidade portuguesa é conhecida como "Cidade dos Estudantes"?', ['Coimbra', 'Braga', 'Évora', 'Aveiro']],
  ['Que cidade portuguesa é conhecida como "Cidade dos Arcebispos"?', ['Braga', 'Guimarães', 'Viana do Castelo', 'Barcelos']],
  ['Em que cidade fica a Torre de Belém?', ['Lisboa', 'Porto', 'Sintra', 'Setúbal']],
  ['Em que ano ocorreram as aparições de Fátima?', ['1917', '1910', '1926', '1932']],
  ['Quantos distritos tem Portugal continental?', ['18', '20', '16', '22']],
  ['Qual é a maior ilha do mundo?', ['Gronelândia', 'Madagáscar', 'Bornéu', 'Sumatra']],
  ['Que país europeu tem a forma de uma bota?', ['Itália', 'Grécia', 'Espanha', 'Portugal']],
  ['Em que cidade fica a Torre Eiffel?', ['Paris', 'Londres', 'Roma', 'Berlim']],
  ['Em que cidade fica o Coliseu?', ['Roma', 'Atenas', 'Madrid', 'Veneza']],
  ['Em que cidade fica a Estátua da Liberdade?', ['Nova Iorque', 'Washington', 'Boston', 'Chicago']]
];

const QUESTIONS = RAW_QUESTIONS.map(([q, opts]) => ({ q, opts }));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --------------------------------- Estado --------------------------------- */
// player: { id, name, ready, role, state, lastComp, maxFreezeTime, isHacking, ... }
const players = new Map();
const game = {
  phase: 'lobby',          // lobby | playing | ended
  matrix: 0,
  popups: {},              // victimId -> popup
  pendingSaves: {},        // victimId -> saviorId
  votes: new Set(),
  hunterReadyAt: 0
};

function newPlayer(id, name) {
  return {
    id, name,
    ready: false,
    role: null,              // 'hunter' | 'runner'
    state: 'alive',          // alive | freezing | frozen
    lastComp: null,
    maxFreezeTime: CFG.FREEZE_SECONDS,
    isHacking: false,
    // internos
    currentComp: null,
    currentQ: null,          // { correctIdx }
    usedQ: new Set(),
    hackStartedAt: 0,
    cooldownUntil: 0
  };
}

function broadcastLobby() {
  io.emit('lobby_update', {
    phase: game.phase,
    players: [...players.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready }))
  });
}
function broadcastPlayers() {
  io.emit('players_update', {
    players: [...players.values()].map(p => ({ id: p.id, name: p.name, role: p.role, state: p.state }))
  });
}
function emitMatrix() {
  io.emit('update_computers', { count: game.matrix, total: CFG.MATRIX_TARGET });
}
function emitVotes() {
  io.emit('vote_update', { votes: game.votes.size, total: players.size });
}
function publicPopup(p) {
  return { id: p.id, name: p.name, capsule: p.capsule, remaining: p.remaining, grace: p.grace };
}

/* ------------------------------ Fluxo do jogo ------------------------------ */
function checkStart() {
  if (game.phase !== 'lobby') return;
  const list = [...players.values()];
  if (list.length >= CFG.MIN_PLAYERS && list.every(p => p.ready)) startGame(list);
}

function startGame(list) {
  game.phase = 'playing';
  game.matrix = 0;
  game.votes.clear();
  game.popups = {};
  game.pendingSaves = {};

  const hunter = list[Math.floor(Math.random() * list.length)];
  list.forEach(p => {
    p.role = p === hunter ? 'hunter' : 'runner';
    p.state = 'alive';
    p.lastComp = null;
    p.maxFreezeTime = CFG.FREEZE_SECONDS;
    p.isHacking = false;
    p.currentComp = null;
    p.currentQ = null;
    p.hackStartedAt = 0;
    p.cooldownUntil = 0;
  });
  // margem de 3s para latência/relógio dos clientes
  game.hunterReadyAt = Date.now() + CFG.ROULETTE_MS + CFG.HUNTER_WAIT * 1000 - 3000;

  const names = list.map(p => p.name);
  list.forEach(p => {
    io.to(p.id).emit('start_game_roulette', { role: p.role, names, total: CFG.MATRIX_TARGET });
  });
  broadcastPlayers();
  emitMatrix();
  emitVotes();
}

function endGame(winner) {
  if (game.phase !== 'playing') return;
  game.phase = 'ended';
  Object.values(game.popups).forEach(p => clearInterval(p.timer));
  game.popups = {};
  game.pendingSaves = {};
  io.emit('game_over', { winner });
}

function checkHunterWin() {
  if (game.phase !== 'playing') return;
  const active = Object.keys(game.popups).length;
  const runners = [...players.values()].filter(p => p.role === 'runner');
  const allDown = runners.length > 0 && runners.every(p => p.state !== 'alive');
  if (active >= 3 || allDown) endGame('hunter');
}

function fullReset() {
  Object.values(game.popups).forEach(p => clearInterval(p.timer));
  game.phase = 'lobby';
  game.matrix = 0;
  game.popups = {};
  game.pendingSaves = {};
  game.votes.clear();
  game.hunterReadyAt = 0;
  players.forEach(p => {
    p.ready = false;
    p.role = null;
    p.state = 'alive';
    p.lastComp = null;
    p.maxFreezeTime = CFG.FREEZE_SECONDS;
    p.isHacking = false;
    p.currentComp = null;
    p.currentQ = null;
    p.usedQ = new Set();
    p.hackStartedAt = 0;
    p.cooldownUntil = 0;
  });
  io.emit('full_reset_lobby');
  broadcastLobby();
}

function checkReset() {
  if (game.phase !== 'lobby' && players.size > 0 && game.votes.size === players.size) fullReset();
}

/* ------------------------------ Congelamento ------------------------------- */
function startFreeze(target, capsule) {
  target.state = 'freezing';
  target.isHacking = false;
  target.currentQ = null;
  target.currentComp = null;
  io.to(target.id).emit('force_stop_hack');

  const popup = {
    id: target.id,
    name: target.name,
    capsule,
    remaining: target.maxFreezeTime > 0 ? target.maxFreezeTime : CFG.FREEZE_SECONDS,
    grace: CFG.FREEZE_GRACE,
    timer: null
  };
  game.popups[target.id] = popup;
  io.emit('popup_freeze_start', publicPopup(popup));
  popup.timer = setInterval(() => tickPopup(popup), 1000);
  broadcastPlayers();
  checkHunterWin();
}

function tickPopup(popup) {
  if (game.popups[popup.id] !== popup) { clearInterval(popup.timer); return; }
  const p = players.get(popup.id);
  if (popup.grace > 0) {
    popup.grace--;
  } else {
    popup.remaining--;
    if (p) p.maxFreezeTime = Math.max(0, popup.remaining);
  }
  io.emit('popup_freeze_tick', { id: popup.id, remaining: Math.max(0, popup.remaining), grace: popup.grace });

  if (popup.remaining <= 0) {
    clearInterval(popup.timer);
    delete game.popups[popup.id];
    delete game.pendingSaves[popup.id];
    if (p) p.state = 'frozen';
    io.emit('popup_freeze_ended', { id: popup.id, name: popup.name });
    broadcastPlayers();
    checkHunterWin();
  }
}

/* -------------------------------- Perguntas -------------------------------- */
function sendQuestion(p) {
  let pool = [];
  for (let i = 0; i < QUESTIONS.length; i++) if (!p.usedQ.has(i)) pool.push(i);
  if (pool.length === 0) { p.usedQ = new Set(); pool = QUESTIONS.map((_, i) => i); }
  const idx = pool[Math.floor(Math.random() * pool.length)];
  p.usedQ.add(idx);
  const item = QUESTIONS[idx];
  const options = shuffle(item.opts.map((t, i) => ({ t, correct: i === 0 })));
  p.currentQ = { correctIdx: options.findIndex(o => o.correct) };
  io.to(p.id).emit('receive_question', { question: item.q, options: options.map(o => o.t) });
}

/* --------------------------------- Sockets --------------------------------- */
io.on('connection', (socket) => {

  socket.on('login', (data) => {
    const name = String((data && data.name) || '').trim().slice(0, CFG.MAX_NAME);
    if (!name) return socket.emit('login_error', { message: 'Escreve um nome.' });
    if (game.phase !== 'lobby') return socket.emit('login_error', { message: 'Há um jogo em curso. Aguarda pelo reinício.' });
    if (players.has(socket.id)) return;
    const taken = [...players.values()].some(p => p.name.toLowerCase() === name.toLowerCase());
    if (taken) return socket.emit('login_error', { message: 'Esse nome já está a ser usado.' });

    players.set(socket.id, newPlayer(socket.id, name));
    socket.emit('login_ok', { id: socket.id, name });
    broadcastLobby();
  });

  socket.on('toggle_ready', (data) => {
    const p = players.get(socket.id);
    if (!p || game.phase !== 'lobby') return;
    if (!p.ready && !(data && data.hasMap)) return; // só fica pronto com mapa escolhido
    p.ready = !p.ready;
    broadcastLobby();
    checkStart();
  });

  /* ---- Hackeio ---- */
  socket.on('get_question', (data) => {
    const p = players.get(socket.id);
    if (!p || game.phase !== 'playing' || p.role !== 'runner' || p.state !== 'alive') return;

    if (!p.isHacking) {
      const comp = data && data.computer;
      if (!CFG.COMPUTERS.includes(comp)) return socket.emit('hack_error', { message: 'Computador inválido.' });
      if (comp === p.lastComp) return socket.emit('hack_error', { message: 'Não podes repetir o último computador.' });
      if (p.cooldownUntil - Date.now() > 1000) return socket.emit('hack_error', { message: 'Ainda estás em cooldown.' });
      p.isHacking = true;
      p.currentComp = comp;
      p.hackStartedAt = Date.now();
    }
    sendQuestion(p);
  });

  socket.on('answer_question', (data) => {
    const p = players.get(socket.id);
    if (!p || !p.isHacking || !p.currentQ) return;
    const ans = Number(data && data.answer);
    const correctIdx = p.currentQ.correctIdx;
    p.currentQ = null;
    socket.emit('answer_result', { correct: ans === correctIdx, correctIndex: correctIdx });
  });

  socket.on('cancel_hack', () => {
    const p = players.get(socket.id);
    if (!p) return;
    p.isHacking = false;
    p.currentComp = null;
    p.currentQ = null;
  });

  socket.on('hack_complete', () => {
    const p = players.get(socket.id);
    if (!p || game.phase !== 'playing' || p.role !== 'runner' || p.state !== 'alive') return;
    if (!p.isHacking || !p.currentComp) return;
    if (Date.now() - p.hackStartedAt < CFG.MIN_HACK_MS) {
      p.isHacking = false; p.currentComp = null; p.currentQ = null;
      return socket.emit('hack_error', { message: 'Hackeio inválido.' });
    }
    p.lastComp = p.currentComp;
    p.isHacking = false;
    p.currentComp = null;
    p.currentQ = null;
    p.cooldownUntil = Date.now() + CFG.HACK_COOLDOWN_MS;
    game.matrix++;
    emitMatrix();
    socket.emit('hack_success', { lastComp: p.lastComp, cooldownMs: CFG.HACK_COOLDOWN_MS });
    if (game.matrix >= CFG.MATRIX_TARGET) endGame('runners');
  });

  /* ---- Caçador ---- */
  socket.on('freeze_player', (data) => {
    const h = players.get(socket.id);
    if (!h || game.phase !== 'playing' || h.role !== 'hunter') return;
    if (Date.now() < game.hunterReadyAt) return socket.emit('freeze_error', { message: 'Ainda não podes capturar.' });
    const t = players.get(data && data.targetId);
    const cap = Number(data && data.capsule);
    if (!t || t.role !== 'runner' || t.state !== 'alive') return socket.emit('freeze_error', { message: 'Alvo inválido.' });
    if (!CFG.CAPSULES.includes(cap)) return socket.emit('freeze_error', { message: 'Cápsula inválida.' });
    if (Object.values(game.popups).some(p => p.capsule === cap)) return socket.emit('freeze_error', { message: 'Essa cápsula já está ocupada.' });
    startFreeze(t, cap);
    socket.emit('freeze_ok');
  });

  /* ---- Salvamento ---- */
  socket.on('request_save', (data) => {
    const victim = players.get(socket.id);
    if (!victim || game.phase !== 'playing' || victim.state !== 'freezing') return;
    const popup = game.popups[victim.id];
    if (!popup || popup.remaining <= 0) return;
    const savior = players.get(data && data.saviorId);
    if (!savior || savior.id === victim.id || savior.role !== 'runner' || savior.state !== 'alive') {
      return socket.emit('save_denied', { reason: 'Esse jogador não pode salvar-te.' });
    }
    if (savior.isHacking) {
      return socket.emit('save_denied', { reason: savior.name + ' está a hackear e não pode salvar agora.' });
    }
    game.pendingSaves[victim.id] = savior.id;
    io.to(savior.id).emit('prompt_save_confirmation', { victimId: victim.id, victimName: victim.name });
  });

  socket.on('decline_save', (data) => {
    const vid = data && data.victimId;
    if (game.pendingSaves[vid] !== socket.id) return;
    delete game.pendingSaves[vid];
    io.to(vid).emit('save_denied', { reason: 'O salvamento foi recusado.' });
  });

  socket.on('confirm_save', (data) => {
    const savior = players.get(socket.id);
    const vid = data && data.victimId;
    if (!savior || game.phase !== 'playing' || game.pendingSaves[vid] !== socket.id) return;
    const victim = players.get(vid);
    const popup = game.popups[vid];
    delete game.pendingSaves[vid];
    if (!victim || !popup || victim.state !== 'freezing') return;
    if (savior.state !== 'alive' || savior.isHacking) {
      socket.emit('save_error', { message: 'Não podes salvar enquanto estás a hackear.' });
      io.to(vid).emit('save_denied', { reason: savior.name + ' não está disponível.' });
      return;
    }
    clearInterval(popup.timer);
    delete game.popups[vid];
    victim.state = 'alive';
    victim.maxFreezeTime = Math.max(1, popup.remaining); // tempo residual guardado
    io.emit('popup_freeze_cancelled', { id: vid });
    io.to(vid).emit('saved');
    broadcastPlayers();
  });

  /* ---- Reinício global ---- */
  socket.on('vote_reset', () => {
    if (!players.has(socket.id) || game.phase === 'lobby') return;
    game.votes.add(socket.id);
    emitVotes();
    checkReset();
  });

  /* ---- Desligar ---- */
  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    if (!p) return;
    const popup = game.popups[socket.id];
    if (popup) { clearInterval(popup.timer); delete game.popups[socket.id]; io.emit('popup_freeze_cancelled', { id: socket.id }); }
    delete game.pendingSaves[socket.id];
    Object.keys(game.pendingSaves).forEach(v => { if (game.pendingSaves[v] === socket.id) delete game.pendingSaves[v]; });
    game.votes.delete(socket.id);
    players.delete(socket.id);

    if (players.size === 0) { fullReset(); return; }
    if (game.phase === 'lobby') {
      broadcastLobby();
    } else {
      broadcastPlayers();
      emitVotes();
      checkHunterWin();
      checkReset();
    }
  });
});

server.listen(CFG.PORT, () => console.log('C&C a correr na porta ' + CFG.PORT));
