/**
 * LOST CITIES ONLINE - CLIENT GAME ENGINE
 * Full Realtime Online & AI Practice & Interactive Tutorial
 */

// Colors and Icons configuration
const COLOR_CONFIG = {
  red: { name: "火山 (赤)", icon: "🌋", color: "#e63946" },
  blue: { name: "海洋 (青)", icon: "🌊", color: "#0096c7" },
  green: { name: "密林 (緑)", icon: "🌿", color: "#2a9d8f" },
  yellow: { name: "砂漠 (黄)", icon: "🏜️", color: "#f4a261" },
  white: { name: "雪山 (白)", icon: "🏔️", color: "#e0e1dd" }
};
const COLORS = ["red", "blue", "green", "yellow", "white"];

// --- SOUND ENGINE (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playSelect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCardPlay() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playDiscard() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDraw() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.3);
    });
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}

const sounds = new SoundEngine();

// --- STATE MANAGEMENT ---
let myPlayerId = localStorage.getItem("lc_player_id") || "P_" + Math.random().toString(36).substring(2, 9);
localStorage.setItem("lc_player_id", myPlayerId);

let myPlayerName = localStorage.getItem("lc_player_name") || "探検家" + Math.floor(Math.random() * 900 + 100);
let currentRoomId = null;
let ws = null;
let peer = null;
let peerConn = null;
let isPeerHost = false;
let currentGameState = null;
let selectedHandCardId = null;
let gameMode = "online"; // "online", "cpu", "pass_play"
let cpuGameInstance = null;
let passPlayInstance = null;

// Settings
let settings = {
  sound: true,
  scoreAssist: true,
  logDrawer: true
};
try {
  const saved = JSON.parse(localStorage.getItem("lc_settings") || "{}");
  settings = { ...settings, ...saved };
} catch(e) {}
sounds.enabled = settings.sound;

// Stats
let stats = {
  totalMatches: 0,
  wins: 0,
  highScore: 0,
  history: []
};
try {
  const savedStats = JSON.parse(localStorage.getItem("lc_stats") || "{}");
  stats = { ...stats, ...savedStats };
} catch(e) {}

function saveStats() {
  localStorage.setItem("lc_stats", JSON.stringify(stats));
  updateStatsDisplay();
}

// --- DOM ELEMENTS ---
const screens = {
  lobby: document.getElementById("lobbyScreen"),
  waiting: document.getElementById("waitingScreen"),
  game: document.getElementById("gameScreen")
};

const modals = {
  result: document.getElementById("resultModal"),
  rules: document.getElementById("rulesModal"),
  tutorial: document.getElementById("tutorialModal"),
  stats: document.getElementById("statsModal"),
  settings: document.getElementById("settingsModal"),
  mobileConnect: document.getElementById("mobileConnectModal"),
  passTurn: document.getElementById("passTurnModal")
};

// サーバー(FastAPI)が動いているか判定（結果はキャッシュ）
let serverCheckPromise = null;
function detectServer() {
  if (!serverCheckPromise) {
    serverCheckPromise = window.location.protocol === "file:"
      ? Promise.resolve(false)
      : fetch("/api/server-info").then(r => r.ok).catch(() => false);
  }
  return serverCheckPromise;
}

let serverMobileUrl = null;
async function fetchServerInfo() {
  try {
    const res = await fetch("/api/server-info");
    const data = await res.json();
    serverMobileUrl = data.mobile_url;
  } catch(e) {
    serverMobileUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
  }
}

function showScreen(screenKey) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  if (screens[screenKey]) screens[screenKey].classList.add("active");
}

function getModalElement(modalKey) {
  if (modals[modalKey]) return modals[modalKey];
  if (typeof modalKey === "string") {
    // Try with and without 'Modal' suffix
    const el1 = document.getElementById(modalKey);
    if (el1) return el1;
    const el2 = document.getElementById(modalKey + "Modal");
    if (el2) return el2;
    const cleanKey = modalKey.replace(/Modal$/, "");
    if (modals[cleanKey]) return modals[cleanKey];
  }
  return null;
}

function showModal(modalKey) {
  const el = getModalElement(modalKey);
  if (el) el.classList.remove("hidden");
}

function hideModal(modalKey) {
  const el = getModalElement(modalKey);
  if (el) el.classList.add("hidden");
}

function showToast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2500);
}

// --- INITIALIZATION ---
function generateRandomName() {
  const titles = ["勇敢な", "伝説の", "迅速な", "賢明な", "古代の", "若き", "熟練の", "気高き", "疾風の"];
  const roles = ["探検家", "考古学者", "冒険者", "地図職人", "トレジャーハンター", "航海士"];
  return titles[Math.floor(Math.random() * titles.length)] + roles[Math.floor(Math.random() * roles.length)];
}

function updateAndSavePlayerName(newName, notify = false) {
  const clean = (newName || "").trim().substring(0, 10) || "探検家";
  myPlayerName = clean;
  localStorage.setItem("lc_player_name", myPlayerName);

  const lobbyInput = document.getElementById("playerNameInput");
  if (lobbyInput) lobbyInput.value = myPlayerName;

  const settingsInput = document.getElementById("settingsNameInput");
  if (settingsInput) settingsInput.value = myPlayerName;

  const myNameBadge = document.getElementById("myName");
  if (myNameBadge) myNameBadge.textContent = myPlayerName;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "update_name", name: myPlayerName }));
  }

  if (notify) {
    showToast(`名前を「${myPlayerName}」に保存しました！`);
    sounds.playSelect();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // サーバーがない環境（GitHub Pages / file:// など）ではランダム対戦を無効化し、
  // 友達対戦は PeerJS による P2P 接続に切り替える
  detectServer().then(available => {
    if (available) return;
    const rnd = document.getElementById("randomMatchBtn");
    if (rnd) {
      rnd.disabled = true;
      rnd.title = "サーバー起動時のみ利用できます";
      rnd.style.opacity = "0.4";
    }
    const banner = document.querySelector(".mobile-connect-banner");
    if (banner) banner.style.display = "none";
  });

  const nameInput = document.getElementById("playerNameInput");
  if (nameInput) {
    nameInput.value = myPlayerName;
    nameInput.addEventListener("change", (e) => {
      updateAndSavePlayerName(e.target.value, true);
    });
  }

  const settingsNameInput = document.getElementById("settingsNameInput");
  if (settingsNameInput) {
    settingsNameInput.value = myPlayerName;
    settingsNameInput.addEventListener("change", (e) => {
      updateAndSavePlayerName(e.target.value, false);
    });
  }

  const saveNameBtn = document.getElementById("saveNameBtn");
  if (saveNameBtn) {
    saveNameBtn.addEventListener("click", () => {
      const val = settingsNameInput ? settingsNameInput.value : "";
      updateAndSavePlayerName(val, true);
    });
  }

  document.getElementById("randomNameBtn").addEventListener("click", () => {
    const rnd = generateRandomName();
    updateAndSavePlayerName(rnd, true);
  });

  const settingsRndBtn = document.getElementById("settingsRandomNameBtn");
  if (settingsRndBtn) {
    settingsRndBtn.addEventListener("click", () => {
      const rnd = generateRandomName();
      updateAndSavePlayerName(rnd, true);
    });
  }

  // Buttons in Lobby
  document.getElementById("passAndPlayBtn").addEventListener("click", startPassAndPlayMatch);
  document.getElementById("createRoomBtn").addEventListener("click", () => createOnlineRoom(3, 0));
  document.getElementById("randomMatchBtn").addEventListener("click", matchRandomOnline);
  document.getElementById("cpuMatchBtn").addEventListener("click", startCpuMatch);
  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const code = document.getElementById("joinRoomCodeInput").value.trim().toUpperCase();
    if (code.length === 6) {
      joinOnlineRoom(code);
    } else {
      showToast("6桁のルームコードを入力してください");
      sounds.playError();
    }
  });

  // Mobile Connect QR Modal
  document.getElementById("mobileConnectBtn").addEventListener("click", async () => {
    sounds.playSelect();
    if (!serverMobileUrl) await fetchServerInfo();
    const targetUrl = serverMobileUrl || window.location.href;
    document.getElementById("mobileUrlDisplay").textContent = targetUrl;
    // QuickChart QR Code API
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(targetUrl)}&size=200&margin=1`;
    document.getElementById("mobileQrImg").src = qrUrl;
    showModal("mobileConnect");
  });

  // Footer Actions
  document.getElementById("rulesBtn").addEventListener("click", () => showModal("rules"));
  document.getElementById("tutorialBtn").addEventListener("click", startTutorial);
  document.getElementById("statsBtn").addEventListener("click", () => {
    updateStatsDisplay();
    showModal("stats");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => showModal("settings"));

  // Waiting Room Actions
  document.getElementById("copyUrlBtn").addEventListener("click", () => {
    const input = document.getElementById("inviteUrlInput");
    navigator.clipboard.writeText(input.value).then(() => {
      showToast("招待URLをコピーしました！");
      sounds.playSelect();
    }).catch(() => {
      input.select();
      document.execCommand("copy");
      showToast("招待URLをコピーしました！");
    });
  });
  document.getElementById("cancelWaitBtn").addEventListener("click", () => {
    if (ws) ws.close();
    closeP2P();
    showScreen("lobby");
  });

  // Modal Closers & Overlay click to close
  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.getAttribute("data-close");
      if (target) hideModal(target);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      // Close modal if clicking directly on overlay background
      if (e.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  });

  // Game UI Controls
  document.getElementById("drawDeckSlot").addEventListener("click", onDrawFromDeck);
  document.getElementById("gameMenuBtn").addEventListener("click", () => showModal("settings"));

  // Pass and play curtain button
  const startPassedBtn = document.getElementById("startPassedTurnBtn");
  if (startPassedBtn) {
    startPassedBtn.addEventListener("click", () => {
      sounds.playSelect();
      hideModal("passTurn");
      if (passPlayInstance) {
        passPlayInstance.resumeTurn();
      }
    });
  }

  // Return to Lobby
  const handleExitToLobby = () => {
    sounds.playSelect();
    if (confirm("ホーム（ロビー）に戻りますか？\n（現在の対戦は中断されます）")) {
      if (ws) {
        ws.close();
        ws = null;
      }
      closeP2P();
      gameMode = "online";
      cpuGameInstance = null;
      passPlayInstance = null;
      currentGameState = null;
      hideModal("settings");
      hideModal("result");
      hideModal("passTurn");
      showScreen("lobby");
    }
  };

  const returnBtn = document.getElementById("returnToLobbyBtn");
  if (returnBtn) returnBtn.addEventListener("click", handleExitToLobby);

  const modalExitBtn = document.getElementById("modalExitToLobbyBtn");
  if (modalExitBtn) modalExitBtn.addEventListener("click", handleExitToLobby);

  // Discard Slot Clicks
  COLORS.forEach(color => {
    const slot = document.getElementById(`discard_${color}`);
    if (slot) {
      slot.addEventListener("click", () => onDiscardSlotClick(color));
    }
    const myExp = document.getElementById(`myExp_${color}`);
    if (myExp) {
      myExp.addEventListener("click", () => onMyExpeditionSlotClick(color));
    }
  });

  // Result Modal Next / Rematch
  document.getElementById("nextRoundBtn").addEventListener("click", (e) => {
    if (gameMode === "pass_play" && passPlayInstance) {
      passPlayInstance.nextRound();
      hideModal("result");
    } else if (gameMode === "cpu" && cpuGameInstance) {
      cpuGameInstance.nextRound();
      hideModal("result");
    } else if (ws) {
      ws.send(JSON.stringify({ type: "next_round" }));
      e.target.disabled = true;
      e.target.textContent = "相手の準備待ち中... ⏳";
    } else if (peerConn) {
      sendPeerAction({ type: "next_round" });
      e.target.disabled = true;
      e.target.textContent = "相手の準備待ち中... ⏳";
    }
  });

  document.getElementById("rematchBtn").addEventListener("click", (e) => {
    if (gameMode === "pass_play" && passPlayInstance) {
      passPlayInstance.restart();
      hideModal("result");
    } else if (gameMode === "cpu" && cpuGameInstance) {
      cpuGameInstance.restart();
      hideModal("result");
    } else if (ws) {
      ws.send(JSON.stringify({ type: "rematch" }));
      e.target.disabled = true;
      e.target.textContent = "相手の準備待ち中... ⏳";
    } else if (peerConn) {
      sendPeerAction({ type: "rematch" });
      e.target.disabled = true;
      e.target.textContent = "相手の準備待ち中... ⏳";
    }
  });

  document.getElementById("exitToLobbyBtn").addEventListener("click", () => {
    if (ws) ws.close();
    closeP2P();
    gameMode = "online";
    cpuGameInstance = null;
    passPlayInstance = null;
    hideModal("result");
    showScreen("lobby");
  });

  // Settings
  document.getElementById("soundToggle").checked = settings.sound;
  document.getElementById("soundToggle").addEventListener("change", (e) => {
    settings.sound = e.target.checked;
    sounds.enabled = settings.sound;
    localStorage.setItem("lc_settings", JSON.stringify(settings));
  });

  document.getElementById("scoreAssistToggle").checked = settings.scoreAssist;
  document.getElementById("scoreAssistToggle").addEventListener("change", (e) => {
    settings.scoreAssist = e.target.checked;
    localStorage.setItem("lc_settings", JSON.stringify(settings));
    if (currentGameState) renderGameState(currentGameState);
  });

  document.getElementById("resetStatsBtn").addEventListener("click", () => {
    if (confirm("戦績データをリセットしますか？")) {
      stats = { totalMatches: 0, wins: 0, highScore: 0, history: [] };
      saveStats();
      showToast("戦績をリセットしました");
    }
  });

  // URL Query Room Check (direct join)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  if (roomParam) {
    joinOnlineRoom(roomParam.toUpperCase());
  }

  updateStatsDisplay();
});

// --- STATS DISPLAY ---
function updateStatsDisplay() {
  document.getElementById("statTotalMatches").textContent = stats.totalMatches;
  const rate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
  document.getElementById("statWinRate").textContent = `${rate}%`;
  document.getElementById("statHighScore").textContent = stats.highScore;
  document.getElementById("statWins").textContent = stats.wins;

  const historyEl = document.getElementById("historyList");
  if (!stats.history || stats.history.length === 0) {
    historyEl.innerHTML = '<div class="empty-history">まだ対戦記録がありません</div>';
  } else {
    historyEl.innerHTML = stats.history.map(item => `
      <div class="history-item">
        <span>${item.date} vs ${item.oppName}</span>
        <b style="color: ${item.win ? 'var(--accent-emerald)' : 'var(--c-red)'}">
          ${item.win ? '勝利 🏆' : '敗北'} (${item.myScore} - ${item.oppScore})
        </b>
      </div>
    `).join("");
  }
}

// ====================================================
// ONLINE MULTIPLAYER ENGINE (WEBSOCKET)
// ====================================================

async function createOnlineRoom(maxRounds = 3, timeLimit = 0) {
  sounds.playSelect();
  if (!(await detectServer())) {
    createP2PRoom();
    return;
  }
  try {
    const res = await fetch(`/api/room/create?max_rounds=${maxRounds}&time_limit=${timeLimit}`);
    const data = await res.json();
    connectWebSocket(data.room_id);
  } catch (err) {
    showToast("ルーム作成に失敗しました");
    sounds.playError();
  }
}

async function matchRandomOnline() {
  sounds.playSelect();
  try {
    const res = await fetch("/api/room/random");
    const data = await res.json();
    connectWebSocket(data.room_id);
  } catch (err) {
    showToast("マッチングに失敗しました");
    sounds.playError();
  }
}

async function joinOnlineRoom(roomId) {
  sounds.playSelect();
  if (!(await detectServer())) {
    joinP2PRoom(roomId);
    return;
  }
  connectWebSocket(roomId);
}

// ====================================================
// P2P ENGINE (PeerJS / サーバー不要の友達対戦)
// ホスト端末が CpuGame で対戦を進行し、ゲストへ状態を送信する
// ====================================================

const P2P_PREFIX = "lostcity-";

function closeP2P() {
  const conn = peerConn;
  const p = peer;
  // close イベントでの再入を避けるため、先に参照を外す
  peer = null;
  peerConn = null;
  isPeerHost = false;
  if (conn) { try { conn.close(); } catch (e) {} }
  if (p) { try { p.destroy(); } catch (e) {} }
}

function resetForP2P() {
  if (ws) { ws.close(); ws = null; }
  closeP2P();
  cpuGameInstance = null;
  passPlayInstance = null;
  currentGameState = null;
  selectedHandCardId = null;
}

function p2pLeave(message) {
  closeP2P();
  gameMode = "online";
  cpuGameInstance = null;
  currentGameState = null;
  hideModal("result");
  showScreen("lobby");
  showToast(message);
  sounds.playError();
}

function createP2PRoom() {
  if (typeof Peer === "undefined") {
    showToast("P2P通信ライブラリを読み込めません（ネット接続を確認してください）");
    sounds.playError();
    return;
  }
  resetForP2P();
  isPeerHost = true;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, "X");
  currentRoomId = code;

  peer = new Peer(P2P_PREFIX + code);
  peer.on("open", () => {
    document.getElementById("displayRoomCode").textContent = code;
    const base = window.location.href.split("#")[0].split("?")[0];
    const inviteUrl = `${base}?room=${code}`;
    document.getElementById("inviteUrlInput").value = inviteUrl;
    document.getElementById("lineShareBtn").href = `https://line.me/R/msg/text/?${encodeURIComponent("ロストシティでカード対戦しよう！ " + inviteUrl)}`;
    showScreen("waiting");
  });
  peer.on("connection", (conn) => {
    if (peerConn) { conn.close(); return; } // 2人目は拒否
    peerConn = conn;
    conn.on("data", onHostReceive);
    conn.on("close", () => {
      if (peerConn === conn) p2pLeave("相手との接続が切れました");
    });
  });
  peer.on("error", (err) => {
    if (err.type === "unavailable-id") {
      createP2PRoom(); // コード重複時は再生成
    } else {
      p2pLeave("通信エラーが発生しました: " + err.type);
    }
  });
}

function onHostReceive(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "hello") {
    gameMode = "cpu"; // ホスト側の操作は cpuGameInstance へ直結
    cpuGameInstance = new CpuGame({
      p1Id: myPlayerId,
      p1Name: myPlayerName,
      p2Id: "P2P_GUEST",
      p2Name: String(msg.name || "ゲスト").slice(0, 10)
    });
    cpuGameInstance.update();
    return;
  }
  if (!cpuGameInstance) return;
  const g = cpuGameInstance;
  if (msg.type === "play_card") g.playCard("P2P_GUEST", msg.card_id, msg.action);
  else if (msg.type === "draw_card") g.drawCard("P2P_GUEST", msg.source, msg.color || null);
  else if (msg.type === "next_round") g.nextRound();
  else if (msg.type === "rematch" && g.status === "game_over") g.restart();
}

function joinP2PRoom(code) {
  if (typeof Peer === "undefined") {
    showToast("P2P通信ライブラリを読み込めません（ネット接続を確認してください）");
    sounds.playError();
    return;
  }
  resetForP2P();
  gameMode = "p2p_guest";
  currentRoomId = code;
  showToast("接続中...");

  peer = new Peer();
  peer.on("open", () => {
    const conn = peer.connect(P2P_PREFIX + code, { reliable: true });
    peerConn = conn;
    const timer = setTimeout(() => {
      if (!conn.open) p2pLeave("ルームに接続できませんでした");
    }, 15000);
    conn.on("open", () => {
      clearTimeout(timer);
      conn.send({ type: "hello", name: myPlayerName });
    });
    conn.on("data", (msg) => {
      if (msg && msg.type === "state_update") {
        currentGameState = msg.state;
        handleGameStateUpdate(msg.state);
      }
    });
    conn.on("close", () => {
      if (peerConn === conn) p2pLeave("ホストとの接続が切れました");
    });
  });
  peer.on("error", (err) => {
    p2pLeave(err.type === "peer-unavailable" ? "ルームが見つかりません" : "通信エラーが発生しました: " + err.type);
  });
}

function connectWebSocket(roomId) {
  currentRoomId = roomId;
  isCpuMode = false;
  
  if (ws) ws.close();

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}/${myPlayerId}?name=${encodeURIComponent(myPlayerName)}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = async () => {
    // Setup waiting UI
    document.getElementById("displayRoomCode").textContent = roomId;
    if (!serverMobileUrl && window.location.hostname === "localhost") {
      await fetchServerInfo();
    }
    const baseOrigin = (serverMobileUrl && window.location.hostname === "localhost") ? serverMobileUrl : window.location.origin;
    const inviteUrl = `${baseOrigin}${window.location.pathname}?room=${roomId}`;
    document.getElementById("inviteUrlInput").value = inviteUrl;
    document.getElementById("lineShareBtn").href = `https://line.me/R/msg/text/?${encodeURIComponent("ロストシティでカード対戦しよう！ " + inviteUrl)}`;
    showScreen("waiting");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "state_update") {
        currentGameState = data.state;
        handleGameStateUpdate(data.state);
      } else if (data.type === "error") {
        showToast(data.message);
        sounds.playError();
      }
    } catch(e) {
      console.error(e);
    }
  };

  ws.onclose = () => {
    if (screens.game.classList.contains("active") && currentGameState && currentGameState.status === "playing") {
      showToast("接続が切れました。再接続を試みています...");
      setTimeout(() => connectWebSocket(roomId), 2000);
    }
  };

  ws.onerror = () => {
    showToast("通信エラーが発生しました");
  };
}

function handleGameStateUpdate(state) {
  if (state.waiting_for_players) {
    showScreen("waiting");
    return;
  }

  showScreen("game");
  renderGameState(state);

  if (state.status === "round_over" || state.status === "game_over") {
    showResultModal(state);
  } else if (state.status === "playing") {
    hideModal("result");
  }
}

// ====================================================
// GAME STATE RENDERING
// ====================================================

function renderGameState(state) {
  // 1. Header Information
  document.getElementById("myName").textContent = state.me ? state.me.name : "あなた";
  document.getElementById("myCumulativeScore").textContent = state.me ? state.me.cumulative_score : 0;
  
  document.getElementById("oppName").textContent = state.opponent ? state.opponent.name : "相手";
  document.getElementById("oppCumulativeScore").textContent = state.opponent ? state.opponent.cumulative_score : 0;
  document.getElementById("oppHandCount").textContent = state.opp_hand_count || 0;

  document.getElementById("currentRoundNum").textContent = state.current_round;
  document.getElementById("maxRoundNum").textContent = state.max_rounds;
  document.getElementById("deckRemainCount").textContent = state.deck_count;
  document.getElementById("deckInnerCount").textContent = state.deck_count;

  // Timer
  const timerBadge = document.getElementById("timerBadge");
  if (state.time_limit > 0 && state.status === "playing") {
    timerBadge.classList.remove("hidden");
    document.getElementById("timerSeconds").textContent = state.time_left;
  } else {
    timerBadge.classList.add("hidden");
  }

  // Active Turn Badge Highlighting
  const myBadge = document.getElementById("myBadge");
  const oppBadge = document.getElementById("oppBadge");
  if (myBadge && oppBadge) {
    if (state.status === "playing") {
      if (state.is_my_turn) {
        myBadge.classList.add("active-turn");
        oppBadge.classList.remove("active-turn");
      } else {
        myBadge.classList.remove("active-turn");
        oppBadge.classList.add("active-turn");
      }
    } else {
      myBadge.classList.remove("active-turn");
      oppBadge.classList.remove("active-turn");
    }
  }

  // 2. Action Banner
  const banner = document.getElementById("actionBanner");
  const bannerIcon = document.getElementById("actionBannerIcon");
  const bannerText = document.getElementById("actionBannerText");

  if (state.status !== "playing") {
    banner.className = "action-banner";
    bannerIcon.textContent = "🏁";
    bannerText.textContent = state.last_action_text || "ゲーム終了";
  } else if (state.is_my_turn) {
    banner.className = "action-banner your-turn";
    if (state.turn_step === 1) {
      if (!selectedHandCardId) {
        bannerIcon.textContent = "👆";
        bannerText.textContent = "【STEP 1】手札のカードをタップして選択してください";
      } else {
        const canPlay = !!state.valid_expeditions[selectedHandCardId];
        if (canPlay) {
          bannerIcon.textContent = "📍";
          bannerText.textContent = "【探検スペース】をタップして配置、または【捨て場】をタップして捨てる";
        } else {
          bannerIcon.textContent = "🗑️";
          bannerText.textContent = "このカードは配置できません。【捨て場】をタップして捨ててください";
        }
      }
    } else {
      bannerIcon.textContent = "📥";
      bannerText.textContent = "【STEP 2】山札 または 捨て札置き場から1枚 引く";
    }
  } else {
    banner.className = "action-banner opp-turn";
    bannerIcon.textContent = "⏳";
    bannerText.textContent = `相手（${state.opponent ? state.opponent.name : '対戦相手'}）のターン中... 思考を待っています`;
  }

  // 3. Render Opponent's Expeditions
  COLORS.forEach(color => {
    const cards = state.opp_expeditions[color] || [];
    const container = document.getElementById(`oppCards_${color}`);
    container.innerHTML = cards.map(c => renderMiniCard(c)).join("");
    
    // Score
    const sc = state.opp_scores && state.opp_scores.details ? state.opp_scores.details[color] : null;
    const scoreEl = document.getElementById(`oppScore_${color}`);
    if (sc && settings.scoreAssist) {
      scoreEl.textContent = sc.total > 0 ? `+${sc.total}` : `${sc.total}`;
      scoreEl.style.color = sc.total > 0 ? "var(--accent-emerald)" : (sc.total < 0 ? "#ff4757" : "inherit");
    } else {
      scoreEl.textContent = cards.length > 0 ? `${cards.length}枚` : "0";
      scoreEl.style.color = "inherit";
    }
  });

  // 4. Render Center Discard Piles
  COLORS.forEach(color => {
    const topCard = state.discard_tops[color];
    const count = state.discard_counts[color] || 0;
    const host = document.getElementById(`discardTop_${color}`);
    const countBadge = document.getElementById(`discardCount_${color}`);
    const slot = document.getElementById(`discard_${color}`);

    countBadge.textContent = count;
    if (topCard) {
      host.innerHTML = renderFullCard(topCard, false);
    } else {
      host.innerHTML = "";
    }

    // Step 1 discard highlight or Step 2 draw highlight
    slot.classList.remove("highlight-draw", "disabled-discard", "highlight-discard-target");
    if (state.is_my_turn) {
      if (state.turn_step === 1 && selectedHandCardId) {
        const selectedCard = state.my_hand.find(c => c.id === selectedHandCardId);
        if (selectedCard && selectedCard.color === color) {
          slot.classList.add("highlight-discard-target");
        }
      } else if (state.turn_step === 2) {
        if (count > 0 && color !== state.last_discarded_color) {
          slot.classList.add("highlight-draw");
        } else if (color === state.last_discarded_color) {
          slot.classList.add("disabled-discard");
        }
      }
    }
  });

  // Deck draw highlight
  const deckSlot = document.getElementById("drawDeckSlot");
  deckSlot.classList.remove("highlight-draw");
  if (state.is_my_turn && state.turn_step === 2 && state.deck_count > 0) {
    deckSlot.classList.add("highlight-draw");
  }

  // 5. Render My Expeditions
  COLORS.forEach(color => {
    const cards = state.my_expeditions[color] || [];
    const container = document.getElementById(`myCards_${color}`);
    container.innerHTML = cards.map(c => renderMiniCard(c)).join("");

    const sc = state.my_scores && state.my_scores.details ? state.my_scores.details[color] : null;
    const scoreEl = document.getElementById(`myScore_${color}`);
    const multEl = document.getElementById(`myMult_${color}`);
    const slot = document.getElementById(`myExp_${color}`);

    if (sc && settings.scoreAssist) {
      scoreEl.textContent = sc.total > 0 ? `+${sc.total}` : `${sc.total}`;
      scoreEl.style.color = sc.total > 0 ? "var(--accent-emerald)" : (sc.total < 0 ? "#ff4757" : "inherit");
      multEl.textContent = sc.multiplier > 1 ? `×${sc.multiplier}` : "";
    } else {
      scoreEl.textContent = cards.length > 0 ? `${cards.length}枚` : "0";
      scoreEl.style.color = "inherit";
      multEl.textContent = "";
    }

    // Highlight slot if selected card is valid for this expedition
    slot.classList.remove("highlight-valid");
    if (selectedHandCardId && state.is_my_turn && state.turn_step === 1) {
      const selectedCard = state.my_hand.find(c => c.id === selectedHandCardId);
      if (selectedCard && selectedCard.color === color && state.valid_expeditions[selectedHandCardId]) {
        slot.classList.add("highlight-valid");
      }
    }
  });

  // 6. Render My Hand (相手ターン時は薄く非活性化する)
  const handContainer = document.getElementById("myHandContainer");
  if (state.status === "playing" && !state.is_my_turn) {
    handContainer.classList.add("opponent-turn-dim");
    handContainer.classList.remove("my-turn-active");
  } else {
    handContainer.classList.remove("opponent-turn-dim");
    handContainer.classList.add("my-turn-active");
  }

  handContainer.innerHTML = state.my_hand.map(card => {
    const isSelected = card.id === selectedHandCardId;
    return renderFullCard(card, true, isSelected);
  }).join("");

  // Attach card click handlers
  document.querySelectorAll(".my-hand-card").forEach(cardEl => {
    cardEl.addEventListener("click", () => {
      const cardId = cardEl.getAttribute("data-id");
      onSelectHandCard(cardId);
    });
  });

  // 7. Update Play Log
  if (state.history) {
    const logBox = document.getElementById("logContent");
    logBox.innerHTML = state.history.map(h => `<div class="log-entry">${h.text}</div>`).join("");
  }
}

function renderFullCard(card, isHand = false, isSelected = false) {
  const isInv = card.type === "investment";
  const icon = COLOR_CONFIG[card.color].icon;
  const classes = [
    "game-card",
    `color-${card.color}`,
    isInv ? "investment" : "",
    isHand ? "my-hand-card" : "",
    isSelected ? "selected" : ""
  ].filter(Boolean).join(" ");

  if (isInv) {
    // 握手カード：四隅にエリアのシンボルアイコン＋握手、中央に大きな握手マーク
    return `
      <div class="${classes}" data-id="${card.id}" data-color="${card.color}" title="${COLOR_CONFIG[card.color].name}の投資カード">
        <div class="card-top-corner">
          <span class="card-corner-icon-only">${icon}</span>
          <span class="card-corner-mini-handshake">🤝</span>
        </div>
        <div class="card-center-art inv-art">
          <span class="handshake-large">🤝</span>
        </div>
        <div class="card-bottom-corner">
          <span class="card-corner-icon-only">${icon}</span>
          <span class="card-corner-mini-handshake">🤝</span>
        </div>
      </div>
    `;
  }

  // 数字カード
  return `
    <div class="${classes}" data-id="${card.id}" data-color="${card.color}">
      <div class="card-top-corner">
        <span class="card-corner-num">${card.value}</span>
        <span class="card-corner-icon">${icon}</span>
      </div>
      <div class="card-center-art">
        <span class="num-large">${card.value}</span>
      </div>
      <div class="card-bottom-corner">
        <span class="card-corner-num">${card.value}</span>
        <span class="card-corner-icon">${icon}</span>
      </div>
    </div>
  `;
}

function renderMiniCard(card) {
  const isInv = card.type === "investment";
  const icon = COLOR_CONFIG[card.color].icon;
  if (isInv) {
    // 探検エリアの握手カード：そのエリアの色グラデーション＋大きな握手マーク
    return `
      <div class="mini-card color-${card.color} investment" title="${COLOR_CONFIG[card.color].name} 投資(握手)">
        <span class="mini-handshake">🤝</span>
        <span class="mini-card-icon">${icon}</span>
      </div>
    `;
  }
  // 探検エリアの数字カード：数字を左に大きく、右にエリアアイコン
  return `
    <div class="mini-card color-${card.color}">
      <span class="mini-num">${card.value}</span>
      <span class="mini-card-icon">${icon}</span>
    </div>
  `;
}

// ====================================================
// INTERACTION CONTROLS
// ====================================================

function onSelectHandCard(cardId) {
  if (!currentGameState || !currentGameState.is_my_turn || currentGameState.turn_step !== 1) {
    sounds.playError();
    return;
  }

  if (selectedHandCardId === cardId) {
    // Deselect
    deselectHandCard();
  } else {
    selectedHandCardId = cardId;
    sounds.playSelect();
    renderGameState(currentGameState);
  }
}

function deselectHandCard() {
  selectedHandCardId = null;
  if (currentGameState) renderGameState(currentGameState);
}

function onPlaySelectedCardToExpedition() {
  if (!selectedHandCardId || !currentGameState) return;
  sounds.playCardPlay();
  
  if (gameMode === "pass_play" && passPlayInstance) {
    passPlayInstance.playCard(selectedHandCardId, "expedition");
  } else if (gameMode === "cpu" && cpuGameInstance) {
    cpuGameInstance.playCard(myPlayerId, selectedHandCardId, "expedition");
  } else if (ws) {
    ws.send(JSON.stringify({
      type: "play_card",
      card_id: selectedHandCardId,
      action: "expedition"
    }));
  } else if (peerConn) {
    sendPeerAction({ type: "play_card", card_id: selectedHandCardId, action: "expedition" });
  }
  selectedHandCardId = null;
}

function onDiscardSelectedCard() {
  if (!selectedHandCardId || !currentGameState) return;
  sounds.playDiscard();

  if (gameMode === "pass_play" && passPlayInstance) {
    passPlayInstance.playCard(selectedHandCardId, "discard");
  } else if (gameMode === "cpu" && cpuGameInstance) {
    cpuGameInstance.playCard(myPlayerId, selectedHandCardId, "discard");
  } else if (ws) {
    ws.send(JSON.stringify({
      type: "play_card",
      card_id: selectedHandCardId,
      action: "discard"
    }));
  } else if (peerConn) {
    sendPeerAction({ type: "play_card", card_id: selectedHandCardId, action: "discard" });
  }
  selectedHandCardId = null;
}

function onMyExpeditionSlotClick(color) {
  if (!currentGameState || !currentGameState.is_my_turn) return;

  if (currentGameState.turn_step === 1) {
    if (!selectedHandCardId) {
      showToast("まず手札から出すカードをタップして選んでください");
      sounds.playSelect();
      return;
    }
    const card = currentGameState.my_hand.find(c => c.id === selectedHandCardId);
    if (!card) return;

    if (card.color === color) {
      if (currentGameState.valid_expeditions[selectedHandCardId]) {
        onPlaySelectedCardToExpedition();
      } else {
        showToast("このエリアには配置できません（数字は昇順・投資は数字前のみ）");
        sounds.playError();
      }
    } else {
      showToast(`選択中のカードは【${COLOR_CONFIG[card.color].name}】です。対応するエリアをタップしてください`);
      sounds.playError();
    }
  }
}

function onDiscardSlotClick(color) {
  if (!currentGameState || !currentGameState.is_my_turn) return;

  if (currentGameState.turn_step === 1) {
    if (!selectedHandCardId) {
      showToast("まず手札から捨てるカードをタップして選んでください");
      sounds.playSelect();
      return;
    }
    // STEP 1 でカード選択中に捨て場を押すと直接捨てる（どのスロットを押してもそのカードの捨て場に捨てられます）
    onDiscardSelectedCard();
  } else if (currentGameState.turn_step === 2) {
    // Step 2: Draw from discard pile
    if (color === currentGameState.last_discarded_color) {
      showToast("今自分が捨てたばかりのカードは引けません");
      sounds.playError();
      return;
    }
    const count = currentGameState.discard_counts[color] || 0;
    if (count === 0) {
      showToast("捨て札がありません");
      sounds.playError();
      return;
    }

    sounds.playDraw();
    if (gameMode === "pass_play" && passPlayInstance) {
      passPlayInstance.drawCard("discard", color);
    } else if (gameMode === "cpu" && cpuGameInstance) {
      cpuGameInstance.drawCard(myPlayerId, "discard", color);
    } else if (ws) {
      ws.send(JSON.stringify({
        type: "draw_card",
        source: "discard",
        color: color
      }));
    } else if (peerConn) {
      sendPeerAction({ type: "draw_card", source: "discard", color: color });
    }
  }
}

function onDrawFromDeck() {
  if (!currentGameState || !currentGameState.is_my_turn || currentGameState.turn_step !== 2) return;
  if (currentGameState.deck_count <= 0) {
    showToast("山札がありません");
    sounds.playError();
    return;
  }

  sounds.playDraw();
  if (gameMode === "pass_play" && passPlayInstance) {
    passPlayInstance.drawCard("deck");
  } else if (gameMode === "cpu" && cpuGameInstance) {
    cpuGameInstance.drawCard(myPlayerId, "deck");
  } else if (ws) {
    ws.send(JSON.stringify({
      type: "draw_card",
      source: "deck"
    }));
  } else if (peerConn) {
    sendPeerAction({ type: "draw_card", source: "deck" });
  }
}

// ====================================================
// RESULT MODAL
// ====================================================

function showResultModal(state) {
  const isGameOver = state.status === "game_over";
  const myTotal = state.me ? state.me.cumulative_score : 0;
  const oppTotal = state.opponent ? state.opponent.cumulative_score : 0;
  const myRound = state.my_scores ? state.my_scores.total : 0;
  const oppRound = state.opp_scores ? state.opp_scores.total : 0;

  const maxRounds = state.max_rounds || 3;
  document.getElementById("resultTitle").textContent = isGameOver ? `全 ${maxRounds} ラウンド終了！ 最終結果` : `第 ${state.current_round} / ${maxRounds} ラウンド終了`;
  document.getElementById("resultSubtitle").textContent = isGameOver ? (myTotal > oppTotal ? "おめでとうございます！あなたの勝利です！" : (myTotal < oppTotal ? "惜しくも敗北しました..." : "引き分けです！")) : `第 ${state.current_round + 1} ラウンドへ進めます`;

  const crown = document.getElementById("resultCrown");
  if (isGameOver && myTotal > oppTotal) {
    crown.textContent = "🏆";
    sounds.playVictory();
  } else if (isGameOver && myTotal < oppTotal) {
    crown.textContent = "💀";
  } else {
    crown.textContent = "👑";
  }

  const myName = state.me ? state.me.name : "あなた";
  const oppName = state.opponent ? state.opponent.name : "相手";

  document.getElementById("resMyName").textContent = myName;
  document.getElementById("resMyRoundScore").textContent = (myRound >= 0 ? `+${myRound}` : `${myRound}`);
  document.getElementById("resMyTotalScore").textContent = myTotal;

  document.getElementById("resOppName").textContent = oppName;
  document.getElementById("resOppRoundScore").textContent = (oppRound >= 0 ? `+${oppRound}` : `${oppRound}`);
  document.getElementById("resOppTotalScore").textContent = oppTotal;

  // Rounds History Summary
  const summaryRows = document.getElementById("roundsSummaryRows");
  const myRounds = (state.me && state.me.round_scores) ? state.me.round_scores : [myRound];
  const oppRounds = (state.opponent && state.opponent.round_scores) ? state.opponent.round_scores : [oppRound];
  const totalRoundsCount = Math.max(myRounds.length, oppRounds.length, 1);

  let rowsHtml = `
    <div style="display: grid; grid-template-columns: 80px 1fr 1fr; text-align: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.15); font-weight: 700; color: var(--text-muted); font-size: 0.75rem;">
      <span>ラウンド</span>
      <span style="color: var(--accent-cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${myName}</span>
      <span style="color: var(--accent-magenta); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${oppName}</span>
    </div>
  `;

  for (let r = 0; r < totalRoundsCount; r++) {
    const mScore = myRounds[r] !== undefined ? myRounds[r] : "-";
    const oScore = oppRounds[r] !== undefined ? oppRounds[r] : "-";
    const isCurrent = (r === totalRoundsCount - 1);
    rowsHtml += `
      <div style="display: grid; grid-template-columns: 80px 1fr 1fr; text-align: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); ${isCurrent ? 'background: rgba(255,255,255,0.08); border-radius: 4px; font-weight: bold;' : ''}">
        <span>第${r + 1}R ${isCurrent ? '⚡' : ''}</span>
        <span style="color: ${mScore > 0 ? '#4ade80' : (mScore < 0 ? '#f87171' : '#fff')}">${mScore > 0 ? '+' : ''}${mScore} pts</span>
        <span style="color: ${oScore > 0 ? '#4ade80' : (oScore < 0 ? '#f87171' : '#fff')}">${oScore > 0 ? '+' : ''}${oScore} pts</span>
      </div>
    `;
  }

  rowsHtml += `
    <div style="display: grid; grid-template-columns: 80px 1fr 1fr; text-align: center; padding: 6px 0; font-weight: 900; color: var(--accent-gold); border-top: 1px solid rgba(255,255,255,0.25); font-size: 0.85rem;">
      <span>総合計</span>
      <span>${myTotal} pts</span>
      <span>${oppTotal} pts</span>
    </div>
  `;
  summaryRows.innerHTML = rowsHtml;

  // Breakdown details
  const bTable = document.getElementById("breakdownTable");
  if (state.my_scores && state.my_scores.details) {
    bTable.innerHTML = COLORS.map(color => {
      const d = state.my_scores.details[color];
      if (d.card_count === 0) {
        return `
          <div class="breakdown-row">
            <span class="breakdown-color-tag">${COLOR_CONFIG[color].icon} ${COLOR_CONFIG[color].name}</span>
            <span class="breakdown-calc">カードなし</span>
            <span class="breakdown-total">0点</span>
          </div>
        `;
      }
      return `
        <div class="breakdown-row">
          <span class="breakdown-color-tag">${COLOR_CONFIG[color].icon} ${COLOR_CONFIG[color].name}</span>
          <span class="breakdown-calc">(${d.numbers_sum} - 20) × ${d.multiplier}${d.bonus > 0 ? ' + 20' : ''}</span>
          <span class="breakdown-total">${d.total > 0 ? '+' : ''}${d.total}点</span>
        </div>
      `;
    }).join("");
  }

  // Buttons toggle
  const nextBtn = document.getElementById("nextRoundBtn");
  const rematchBtn = document.getElementById("rematchBtn");
  nextBtn.disabled = false;
  nextBtn.textContent = `第 ${state.current_round + 1} ラウンドへ進む ➔`;
  rematchBtn.disabled = false;
  rematchBtn.textContent = "もう一度対戦する 🔄";

  if (isGameOver) {
    nextBtn.classList.add("hidden");
    rematchBtn.classList.remove("hidden");

    // Record stats
    stats.totalMatches += 1;
    if (myTotal > oppTotal) stats.wins += 1;
    if (myTotal > stats.highScore) stats.highScore = myTotal;
    stats.history.unshift({
      date: new Date().toLocaleDateString("ja-JP"),
      oppName: state.opponent ? state.opponent.name : "相手",
      myScore: myTotal,
      oppScore: oppTotal,
      win: myTotal > oppTotal
    });
    if (stats.history.length > 20) stats.history.pop();
    saveStats();
  } else {
    nextBtn.classList.remove("hidden");
    rematchBtn.classList.add("hidden");
  }

  showModal("result");
}

// ====================================================
// CPU PRACTICE ENGINE (OFFLINE AI)
// ====================================================

class CpuGame {
  constructor(opts = {}) {
    this.maxRounds = 3;
    this.currentRound = 1;
    this.p1 = opts.p1Id || myPlayerId;
    this.p2 = opts.p2Id || "CPU_BOT";
    this.p1Name = opts.p1Name || myPlayerName;
    this.p2Name = opts.p2Name || "AI教授・アレン";
    this.vsCpu = !opts.p2Id;
    this.cumulativeScores = { [this.p1]: 0, [this.p2]: 0 };
    this.status = "playing";
    this.roundScores = { [this.p1]: [], [this.p2]: [] };
    this.initRound();
  }

  initRound() {
    this.deck = this.createDeck();
    this.discardPiles = { red: [], blue: [], green: [], yellow: [], white: [] };
    this.hands = {
      [this.p1]: [this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop()],
      [this.p2]: [this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop()]
    };
    this.sortHand(this.p1);
    this.sortHand(this.p2);
    this.expeditions = {
      [this.p1]: { red: [], blue: [], green: [], yellow: [], white: [] },
      [this.p2]: { red: [], blue: [], green: [], yellow: [], white: [] }
    };
    this.turnPlayer = (this.currentRound % 2 === 1) ? this.p1 : this.p2;
    this.turnStep = 1;
    this.lastDiscardedColor = null;
    this.history = [];
    this.lastActionText = `第 ${this.currentRound} ラウンド開始！`;
    this.status = "playing";

    if (this.vsCpu && this.turnPlayer === this.p2) {
      setTimeout(() => this.runCpuTurn(), 800);
    }
  }

  createDeck() {
    const deck = [];
    COLORS.forEach(c => {
      for (let i = 0; i < 3; i++) {
        deck.push({ id: `${c}_inv_${i}`, color: c, type: "investment", value: 0, label: "投資" });
      }
      for (let v = 2; v <= 10; v++) {
        deck.push({ id: `${c}_${v}`, color: c, type: "number", value: v, label: String(v) });
      }
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  sortHand(pId) {
    const order = { red: 0, blue: 1, green: 2, yellow: 3, white: 4 };
    this.hands[pId].sort((a, b) => {
      if (order[a.color] !== order[b.color]) return order[a.color] - order[b.color];
      if (a.type !== b.type) return a.type === "investment" ? -1 : 1;
      return a.value - b.value;
    });
  }

  canPlayExpedition(pId, card) {
    const exp = this.expeditions[pId][card.color];
    if (card.type === "investment") {
      const hasNum = exp.some(c => c.type === "number");
      if (hasNum) return false;
      const invCount = exp.filter(c => c.type === "investment").length;
      return invCount < 3;
    } else {
      let maxNum = 0;
      exp.forEach(c => {
        if (c.type === "number" && c.value > maxNum) maxNum = c.value;
      });
      return card.value > maxNum;
    }
  }

  playCard(pId, cardId, action) {
    if (this.status !== "playing" || this.turnPlayer !== pId || this.turnStep !== 1) return;
    const hand = this.hands[pId];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;
    const card = hand[cardIdx];

    if (action === "expedition") {
      if (!this.canPlayExpedition(pId, card)) return;
      hand.splice(cardIdx, 1);
      this.expeditions[pId][card.color].push(card);
      this.lastDiscardedColor = null;
      const name = pId === this.p1 ? this.p1Name : this.p2Name;
      this.lastActionText = `${name} が ${COLOR_CONFIG[card.color].name} に ${card.type === 'investment' ? '投資カード' : '数字 ' + card.value} を配置しました。`;
      this.history.push({ text: this.lastActionText });
      this.turnStep = 2;
    } else if (action === "discard") {
      hand.splice(cardIdx, 1);
      this.discardPiles[card.color].push(card);
      this.lastDiscardedColor = card.color;
      const name = pId === this.p1 ? this.p1Name : this.p2Name;
      this.lastActionText = `${name} が ${COLOR_CONFIG[card.color].name} の捨て札に ${card.type === 'investment' ? '投資カード' : '数字 ' + card.value} を捨てました。`;
      this.history.push({ text: this.lastActionText });
      this.turnStep = 2;
    }

    this.update();
  }

  drawCard(pId, source, color = null) {
    if (this.status !== "playing" || this.turnPlayer !== pId || this.turnStep !== 2) return;
    let card = null;

    if (source === "deck") {
      if (this.deck.length === 0) return;
      card = this.deck.pop();
    } else if (source === "discard" && color) {
      if (color === this.lastDiscardedColor) return;
      if (this.discardPiles[color].length === 0) return;
      card = this.discardPiles[color].pop();
    }

    if (!card) return;
    this.hands[pId].push(card);
    this.sortHand(pId);

    // Check round end
    if (this.deck.length === 0) {
      this.endRound();
      return;
    }

    // Switch turn
    this.turnPlayer = (pId === this.p1) ? this.p2 : this.p1;
    this.turnStep = 1;
    this.lastDiscardedColor = null;

    this.update();

    if (this.vsCpu && this.turnPlayer === this.p2 && this.status === "playing") {
      setTimeout(() => this.runCpuTurn(), 700);
    }
  }

  runCpuTurn() {
    if (this.status !== "playing" || this.turnPlayer !== this.p2) return;

    // AI Step 1: Decision
    const hand = this.hands[this.p2];
    let bestPlay = null;

    // Check playable cards
    const playable = [];
    hand.forEach(c => {
      if (this.canPlayExpedition(this.p2, c)) {
        playable.push(c);
      }
    });

    // Evaluate best expedition play: prefer investments or small numbers
    if (playable.length > 0) {
      // Prioritize investment if we have high cards in hand of that color
      const inv = playable.find(c => c.type === "investment");
      if (inv) {
        const matchingNumbers = hand.filter(c => c.color === inv.color && c.type === "number");
        const sum = matchingNumbers.reduce((acc, c) => acc + c.value, 0);
        if (sum >= 15 || matchingNumbers.length >= 2) {
          bestPlay = { card: inv, action: "expedition" };
        }
      }

      if (!bestPlay) {
        // Find smallest number card to play
        const nums = playable.filter(c => c.type === "number");
        if (nums.length > 0) {
          nums.sort((a, b) => a.value - b.value);
          const smallest = nums[0];
          const exp = this.expeditions[this.p2][smallest.color];
          let maxCur = 0;
          exp.forEach(c => { if (c.type === "number" && c.value > maxCur) maxCur = c.value; });
          
          // Only play if gap isn't too huge or if we have already committed
          if (exp.length > 0 || smallest.value <= 6) {
            bestPlay = { card: smallest, action: "expedition" };
          }
        }
      }
    }

    // If no good play, discard a useless card
    if (!bestPlay) {
      // Find card with lowest value or uncommitted color
      let discardCard = hand[0];
      for (const c of hand) {
        const exp = this.expeditions[this.p2][c.color];
        if (exp.length === 0 && c.type === "number" && c.value >= 8) {
          // Avoid discarding high cards opponent might want if opponent committed
          continue;
        }
        discardCard = c;
        break;
      }
      bestPlay = { card: discardCard, action: "discard" };
    }

    // Execute Step 1
    this.playCard(this.p2, bestPlay.card.id, bestPlay.action);

    // AI Step 2: Draw
    setTimeout(() => {
      if (this.status !== "playing" || this.turnPlayer !== this.p2 || this.turnStep !== 2) return;

      // Check if any discard pile has a card we really want
      let drawSource = "deck";
      let drawColor = null;

      for (const c of COLORS) {
        if (c === this.lastDiscardedColor) continue;
        const pile = this.discardPiles[c];
        if (pile.length > 0) {
          const top = pile[pile.length - 1];
          if (this.canPlayExpedition(this.p2, top)) {
            // If top card is beneficial for our active expedition
            const exp = this.expeditions[this.p2][c];
            if (exp.length > 0 && top.type === "number" && top.value <= 8) {
              drawSource = "discard";
              drawColor = c;
              break;
            }
          }
        }
      }

      this.drawCard(this.p2, drawSource, drawColor);
    }, 600);
  }

  calcScores(pId) {
    const exps = this.expeditions[pId];
    const details = {};
    let total = 0;

    COLORS.forEach(c => {
      const cards = exps[c];
      if (cards.length === 0) {
        details[c] = { card_count: 0, investments: 0, numbers_sum: 0, base_score: 0, multiplier: 1, subtotal: 0, bonus: 0, total: 0 };
      } else {
        const inv = cards.filter(x => x.type === "investment").length;
        const sum = cards.filter(x => x.type === "number").reduce((a, x) => a + x.value, 0);
        const base = sum - 20;
        const mult = inv + 1;
        const sub = base * mult;
        const bonus = cards.length >= 8 ? 20 : 0;
        const cardTot = sub + bonus;
        details[c] = { card_count: cards.length, investments: inv, numbers_sum: sum, base_score: base, multiplier: mult, subtotal: sub, bonus: bonus, total: cardTot };
        total += cardTot;
      }
    });

    return { details, total };
  }

  endRound() {
    const p1Sc = this.calcScores(this.p1);
    const p2Sc = this.calcScores(this.p2);

    this.roundScores[this.p1].push(p1Sc);
    this.roundScores[this.p2].push(p2Sc);

    this.cumulativeScores[this.p1] += p1Sc.total;
    this.cumulativeScores[this.p2] += p2Sc.total;

    if (this.currentRound >= this.maxRounds) {
      this.status = "game_over";
      this.lastActionText = "全3ラウンド終了！ 最終結果発表！";
    } else {
      this.status = "round_over";
      this.lastActionText = `第 ${this.currentRound} ラウンド終了！`;
    }

    this.update();
  }

  nextRound() {
    if (this.status !== "round_over") return;
    this.currentRound += 1;
    this.initRound();
    this.update();
  }

  restart() {
    this.currentRound = 1;
    this.cumulativeScores = { [this.p1]: 0, [this.p2]: 0 };
    this.roundScores = { [this.p1]: [], [this.p2]: [] };
    this.initRound();
    this.update();
  }

  getState(viewer = this.p1) {
    const me = viewer;
    const opp = (me === this.p1) ? this.p2 : this.p1;
    const discardTops = {};
    const discardCounts = {};
    COLORS.forEach(c => {
      const p = this.discardPiles[c];
      discardTops[c] = p.length > 0 ? p[p.length - 1] : null;
      discardCounts[c] = p.length;
    });

    const validExpeditions = {};
    if (this.status === "playing" && this.turnPlayer === me && this.turnStep === 1) {
      this.hands[me].forEach(card => {
        validExpeditions[card.id] = this.canPlayExpedition(me, card);
      });
    }

    return {
      room_id: "CPU_PRACTICE",
      status: this.status,
      current_round: this.currentRound,
      max_rounds: this.maxRounds,
      time_limit: 0,
      time_left: 0,
      deck_count: this.deck.length,
      turn_player_id: this.turnPlayer,
      is_my_turn: (this.turnPlayer === me),
      turn_step: this.turnStep,
      last_discarded_color: this.lastDiscardedColor,
      last_action_text: this.lastActionText,
      me: {
        id: me,
        name: me === this.p1 ? this.p1Name : this.p2Name,
        cumulative_score: this.cumulativeScores[me],
        round_scores: this.roundScores[me].map(s => s.total)
      },
      opponent: {
        id: opp,
        name: opp === this.p1 ? this.p1Name : this.p2Name,
        connected: true,
        cumulative_score: this.cumulativeScores[opp],
        round_scores: this.roundScores[opp].map(s => s.total)
      },
      my_hand: this.hands[me],
      opp_hand_count: this.hands[opp].length,
      my_expeditions: this.expeditions[me],
      opp_expeditions: this.expeditions[opp],
      my_scores: this.calcScores(me),
      opp_scores: this.calcScores(opp),
      discard_tops: discardTops,
      discard_counts: discardCounts,
      valid_expeditions: validExpeditions,
      history: this.history.slice(-10),
      waiting_for_players: false
    };
  }

  update() {
    currentGameState = this.getState();
    handleGameStateUpdate(currentGameState);
    // P2P ホスト: ゲストにも状態を送信
    if (!this.vsCpu && peerConn && peerConn.open) {
      peerConn.send({ type: "state_update", state: this.getState(this.p2) });
    }
  }
}

function startCpuMatch() {
  sounds.playSelect();
  if (ws) ws.close();
  closeP2P();
  gameMode = "cpu";
  cpuGameInstance = new CpuGame();
  cpuGameInstance.update();
}

// ====================================================
// PASS & PLAY ENGINE (1台のスマホで2人対面対戦)
// ====================================================

class PassAndPlayGame {
  constructor() {
    this.maxRounds = 3;
    this.currentRound = 1;
    this.p1 = "PLAYER_1";
    this.p2 = "PLAYER_2";
    this.p1Name = myPlayerName || "プレイヤー1";
    this.p2Name = "プレイヤー2";
    this.cumulativeScores = { [this.p1]: 0, [this.p2]: 0 };
    this.roundScores = { [this.p1]: [], [this.p2]: [] };
    this.status = "playing";
    this.initRound();
  }

  initRound() {
    this.deck = this.createDeck();
    this.discardPiles = { red: [], blue: [], green: [], yellow: [], white: [] };
    this.hands = {
      [this.p1]: [this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop()],
      [this.p2]: [this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop(), this.deck.pop()]
    };
    this.sortHand(this.p1);
    this.sortHand(this.p2);
    this.expeditions = {
      [this.p1]: { red: [], blue: [], green: [], yellow: [], white: [] },
      [this.p2]: { red: [], blue: [], green: [], yellow: [], white: [] }
    };
    this.turnPlayer = (this.currentRound % 2 === 1) ? this.p1 : this.p2;
    this.turnStep = 1;
    this.lastDiscardedColor = null;
    this.history = [];
    this.lastActionText = `第 ${this.currentRound} ラウンド開始！ ${this.getCurrentPlayerName()} のターンです。`;
    this.status = "playing";
  }

  getCurrentPlayerName() {
    return this.turnPlayer === this.p1 ? this.p1Name : this.p2Name;
  }

  getNextPlayerName() {
    return this.turnPlayer === this.p1 ? this.p2Name : this.p1Name;
  }

  createDeck() {
    const deck = [];
    COLORS.forEach(c => {
      for (let i = 0; i < 3; i++) {
        deck.push({ id: `${c}_inv_${i}`, color: c, type: "investment", value: 0, label: "投資" });
      }
      for (let v = 2; v <= 10; v++) {
        deck.push({ id: `${c}_${v}`, color: c, type: "number", value: v, label: String(v) });
      }
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  sortHand(pId) {
    const order = { red: 0, blue: 1, green: 2, yellow: 3, white: 4 };
    this.hands[pId].sort((a, b) => {
      if (order[a.color] !== order[b.color]) return order[a.color] - order[b.color];
      if (a.type !== b.type) return a.type === "investment" ? -1 : 1;
      return a.value - b.value;
    });
  }

  canPlayExpedition(pId, card) {
    const exp = this.expeditions[pId][card.color];
    if (card.type === "investment") {
      const hasNum = exp.some(c => c.type === "number");
      if (hasNum) return false;
      const invCount = exp.filter(c => c.type === "investment").length;
      return invCount < 3;
    } else {
      let maxNum = 0;
      exp.forEach(c => {
        if (c.type === "number" && c.value > maxNum) maxNum = c.value;
      });
      return card.value > maxNum;
    }
  }

  playCard(cardId, action) {
    if (this.status !== "playing" || this.turnStep !== 1) return;
    const pId = this.turnPlayer;
    const hand = this.hands[pId];
    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;
    const card = hand[cardIdx];

    if (action === "expedition") {
      if (!this.canPlayExpedition(pId, card)) return;
      hand.splice(cardIdx, 1);
      this.expeditions[pId][card.color].push(card);
      this.lastDiscardedColor = null;
      const name = this.getCurrentPlayerName();
      this.lastActionText = `${name} が ${COLOR_CONFIG[card.color].name} に ${card.type === 'investment' ? '握手カード🤝' : '数字 ' + card.value} を配置しました。`;
      this.history.push({ text: this.lastActionText });
      this.turnStep = 2;
    } else if (action === "discard") {
      hand.splice(cardIdx, 1);
      this.discardPiles[card.color].push(card);
      this.lastDiscardedColor = card.color;
      const name = this.getCurrentPlayerName();
      this.lastActionText = `${name} が ${COLOR_CONFIG[card.color].name} の捨て札に ${card.type === 'investment' ? '握手カード🤝' : '数字 ' + card.value} を捨てました。`;
      this.history.push({ text: this.lastActionText });
      this.turnStep = 2;
    }

    this.update();
  }

  drawCard(source, color = null) {
    if (this.status !== "playing" || this.turnStep !== 2) return;
    const pId = this.turnPlayer;
    let card = null;

    if (source === "deck") {
      if (this.deck.length === 0) return;
      card = this.deck.pop();
    } else if (source === "discard" && color) {
      if (color === this.lastDiscardedColor) return;
      if (this.discardPiles[color].length === 0) return;
      card = this.discardPiles[color].pop();
    }

    if (!card) return;
    this.hands[pId].push(card);
    this.sortHand(pId);

    // Check round end
    if (this.deck.length === 0) {
      this.endRound();
      return;
    }

    // Switch turn and show curtain
    this.turnPlayer = (pId === this.p1) ? this.p2 : this.p1;
    this.turnStep = 1;
    this.lastDiscardedColor = null;

    // Show pass-turn privacy curtain
    this.showCurtain();
  }

  showCurtain() {
    document.getElementById("passTurnTitle").textContent = `${this.getCurrentPlayerName()} のターンです`;
    showModal("passTurn");
  }

  resumeTurn() {
    this.update();
  }

  calcScores(pId) {
    const exps = this.expeditions[pId];
    const details = {};
    let total = 0;

    COLORS.forEach(c => {
      const cards = exps[c];
      if (cards.length === 0) {
        details[c] = { card_count: 0, investments: 0, numbers_sum: 0, base_score: 0, multiplier: 1, subtotal: 0, bonus: 0, total: 0 };
      } else {
        const inv = cards.filter(x => x.type === "investment").length;
        const sum = cards.filter(x => x.type === "number").reduce((a, x) => a + x.value, 0);
        const base = sum - 20;
        const mult = inv + 1;
        const sub = base * mult;
        const bonus = cards.length >= 8 ? 20 : 0;
        const cardTot = sub + bonus;
        details[c] = { card_count: cards.length, investments: inv, numbers_sum: sum, base_score: base, multiplier: mult, subtotal: sub, bonus: bonus, total: cardTot };
        total += cardTot;
      }
    });

    return { details, total };
  }

  endRound() {
    const p1Sc = this.calcScores(this.p1);
    const p2Sc = this.calcScores(this.p2);

    this.roundScores[this.p1].push(p1Sc);
    this.roundScores[this.p2].push(p2Sc);

    this.cumulativeScores[this.p1] += p1Sc.total;
    this.cumulativeScores[this.p2] += p2Sc.total;

    if (this.currentRound >= this.maxRounds) {
      this.status = "game_over";
      this.lastActionText = "全3ラウンド終了！ 最終結果発表！";
    } else {
      this.status = "round_over";
      this.lastActionText = `第 ${this.currentRound} ラウンド終了！`;
    }

    this.update();
  }

  nextRound() {
    if (this.status !== "round_over") return;
    this.currentRound += 1;
    this.initRound();
    this.showCurtain();
  }

  restart() {
    this.currentRound = 1;
    this.cumulativeScores = { [this.p1]: 0, [this.p2]: 0 };
    this.roundScores = { [this.p1]: [], [this.p2]: [] };
    this.initRound();
    this.showCurtain();
  }

  getState() {
    const activeP = this.turnPlayer;
    const oppP = (activeP === this.p1) ? this.p2 : this.p1;

    const discardTops = {};
    const discardCounts = {};
    COLORS.forEach(c => {
      const p = this.discardPiles[c];
      discardTops[c] = p.length > 0 ? p[p.length - 1] : null;
      discardCounts[c] = p.length;
    });

    const validExpeditions = {};
    if (this.status === "playing" && this.turnStep === 1) {
      this.hands[activeP].forEach(card => {
        validExpeditions[card.id] = this.canPlayExpedition(activeP, card);
      });
    }

    return {
      room_id: "PASS_AND_PLAY",
      status: this.status,
      current_round: this.currentRound,
      max_rounds: this.maxRounds,
      time_limit: 0,
      time_left: 0,
      deck_count: this.deck.length,
      turn_player_id: activeP,
      is_my_turn: true,
      turn_step: this.turnStep,
      last_discarded_color: this.lastDiscardedColor,
      last_action_text: this.lastActionText,
      me: {
        id: activeP,
        name: activeP === this.p1 ? this.p1Name : this.p2Name,
        cumulative_score: this.cumulativeScores[activeP],
        round_scores: this.roundScores[activeP].map(s => s.total)
      },
      opponent: {
        id: oppP,
        name: oppP === this.p1 ? this.p1Name : this.p2Name,
        connected: true,
        cumulative_score: this.cumulativeScores[oppP],
        round_scores: this.roundScores[oppP].map(s => s.total)
      },
      my_hand: this.hands[activeP],
      opp_hand_count: this.hands[oppP].length,
      my_expeditions: this.expeditions[activeP],
      opp_expeditions: this.expeditions[oppP],
      my_scores: this.calcScores(activeP),
      opp_scores: this.calcScores(oppP),
      discard_tops: discardTops,
      discard_counts: discardCounts,
      valid_expeditions: validExpeditions,
      history: this.history.slice(-10),
      waiting_for_players: false
    };
  }

  update() {
    currentGameState = this.getState();
    handleGameStateUpdate(currentGameState);
  }
}

function startPassAndPlayMatch() {
  sounds.playSelect();
  if (ws) ws.close();
  closeP2P();
  gameMode = "pass_play";
  passPlayInstance = new PassAndPlayGame();
  passPlayInstance.update();
}

// Helper for P2P messages
function sendPeerAction(data) {
  if (peerConn && peerConn.open) {
    peerConn.send(data);
  }
}

// ====================================================
// INTERACTIVE TUTORIAL
// ====================================================

const TUTORIAL_STEPS = [
  {
    title: "1. 探検の基本と5つのエリア",
    content: `
      <p>ロストシティでは、<b>赤（火山）、青（海洋）、緑（密林）、黄（砂漠）、白（雪山）</b>の5つの秘境を探検します。</p>
      <p>各色には<b>数字カード（2〜10）</b>と<b>投資カード（3枚）</b>の計12枚（全60枚）が存在します。</p>
      <div class="rule-note">毎ターン、手札は常に8枚に保たれます。</div>
    `
  },
  {
    title: "2. カードの出し方（昇順ルール）",
    content: `
      <p>探検エリアに数字カードを置くときは、必ず<b>小さい数字から大きい数字へ（昇順）</b>に置く必要があります。</p>
      <p>例えば、<code>4</code> を置いた後は <code>5〜10</code> しか置けません。一度飛ばした小さい数字（2や3）はもう出せなくなります！</p>
      <div class="rule-note">数字は連続していなくてもOKです（2の次に7を置いても有効）。</div>
    `
  },
  {
    title: "3. 投資カード（握手）の特権",
    content: `
      <p>投資カード（握手🤝）は、そのエリアの最終得点を<b>倍増（×2, ×3, ×4）</b>させる強力なカードです。</p>
      <p>ただし、<b>「数字カードを1枚でも出す前」</b>にしか置けません！</p>
      <div class="rule-note alert">⚠️ 数字カードを1枚置いた後は、そのエリアに投資カードを追加できません。</div>
    `
  },
  {
    title: "4. カードを捨てる & 引く",
    content: `
      <p>出せないカードや出したくないカードは、5色の<b>共有捨て札置き場</b>に捨てることができます。</p>
      <p>カードを出した/捨てた後は、<b>「山札」</b>または<b>「5色の捨て札の一番上」</b>から1枚補充します。</p>
      <div class="rule-note alert">⚠️ 今自分が捨てたばかりのカードを同じターンに引き戻すことは禁止されています。</div>
    `
  },
  {
    title: "5. 得点計算の秘訣",
    content: `
      <p>探検を始めたエリアは、探検コストとして <b>-20点</b> からスタートします！</p>
      <div class="score-formula-box">
        <div><b>（数字合計 − 20点） × （投資枚数 ＋ 1） ＋ ボーナス</b></div>
      </div>
      <p>合計が20点未満だとマイナス点になり、投資していると<b>マイナスも倍増</b>します！無理に全色出さず、勝ち目の高い色に集中するのが勝利の秘訣です。</p>
    `
  }
];

let currentTutStep = 0;

function startTutorial() {
  currentTutStep = 0;
  renderTutorialStep();
  showModal("tutorial");
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[currentTutStep];
  const view = document.getElementById("tutorialStepView");
  view.innerHTML = `
    <h3>${step.title}</h3>
    <div class="tut-body">${step.content}</div>
  `;

  document.getElementById("tutPrevBtn").disabled = (currentTutStep === 0);
  const nextBtn = document.getElementById("tutNextBtn");
  if (currentTutStep === TUTORIAL_STEPS.length - 1) {
    nextBtn.textContent = "CPUと練習対戦へ ➔";
  } else {
    nextBtn.textContent = "次へ ➔";
  }

  // Dots
  const dotsEl = document.getElementById("tutDots");
  dotsEl.innerHTML = TUTORIAL_STEPS.map((_, i) => `<span class="tut-dot ${i === currentTutStep ? 'active' : ''}"></span>`).join("");
}

document.getElementById("tutPrevBtn").addEventListener("click", () => {
  if (currentTutStep > 0) {
    currentTutStep--;
    sounds.playSelect();
    renderTutorialStep();
  }
});

document.getElementById("tutNextBtn").addEventListener("click", () => {
  if (currentTutStep < TUTORIAL_STEPS.length - 1) {
    currentTutStep++;
    sounds.playSelect();
    renderTutorialStep();
  } else {
    hideModal("tutorial");
    startCpuMatch();
  }
});
