// 115A02 警佐晉升警正 AI實作課 — 共用邏輯（Firebase Realtime DB版，無需登入）
const firebaseConfig = {
  apiKey: "AIzaSyBwPR0oE5VK0eBlqq8JY1B56UXy3R9cyng",
  databaseURL: "https://gen-lang-client-0929530380-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gen-lang-client-0929530380",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const ROOT = "nacs0914"; // 獨立命名空間，跟文化遊戲松的資料分開，不互相干擾

let myId = localStorage.getItem('nacs0914_myid');
if (!myId) {
  myId = 'p' + Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem('nacs0914_myid', myId); } catch(e) {}
}
let myNickname = '';
try { myNickname = localStorage.getItem('nacs0914_nickname') || ''; } catch(e) {}
let mySession = 'am';
try { mySession = localStorage.getItem('nacs0914_session') || 'am'; } catch(e) {}

const MOD_NAMES = {1:'模組1 STAR', 2:'模組2 NotebookLM', 3:'模組3 海報', 4:'模組4 反思'};
const SESSION_NAMES = {am:'上午場 RP304', pm:'下午場 RP303'};

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 對已escape過的文字做連結化，讓貼上的網址可以直接點擊
function linkify(escapedText){
  return escapedText.replace(/(https?:\/\/[^\s<]+)/g, url => {
    const m = url.match(/^(.*?)([.,;:!?)）]*)$/);
    const core = m ? m[1] : url;
    const trail = m ? m[2] : '';
    return `<a href="${core}" target="_blank" rel="noopener">${core}</a>${trail}`;
  });
}

// 分頁狀態：每個牆各自記住目前顯示到第幾筆，累加式「顯示更多」
const wallState = {};
const wallData = {};
const PAGE_SIZE = 15;

function renderPagedWall(wallId, docs, renderItemFn, emptyMsg) {
  const wall = document.getElementById(wallId);
  if (!wall) return;
  wallData[wallId] = docs;
  if (!docs.length) {
    wall.innerHTML = `<div class="empty-note">${emptyMsg}</div>`;
    return;
  }
  if (!wallState[wallId]) wallState[wallId] = PAGE_SIZE;
  const visible = docs.slice(0, wallState[wallId]);
  const remain = docs.length - visible.length;
  wall.innerHTML = visible.map((d, i) => renderItemFn(d, i)).join('')
    + (remain > 0 ? `<button class="loadmore" data-wall="${wallId}">顯示更多（還有 ${remain} 則）</button>` : '');
}

function updateTeaserCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n > 0 ? `目前已有 ${n} 則，點右邊看全部` : '目前還沒有人分享';
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.loadmore');
  if (!btn) return;
  const wallId = btn.dataset.wall;
  wallState[wallId] = (wallState[wallId] || PAGE_SIZE) + PAGE_SIZE;
  const renderers = { rosterList: renderRosterList, reflectWall: rerenderReflect, practiceWall: rerenderGeneric, shareWall2: rerenderGeneric, shareWall3: rerenderGeneric, wallFull: renderWallWithScreening };
  if (renderers[wallId]) renderers[wallId](wallId);
});

function rerenderGeneric(wallId) {
  renderPagedWall(wallId, wallData[wallId] || [], shareCardHtml, '還沒有人分享');
}
function rerenderReflect(wallId) {
  renderPagedWall(wallId, wallData[wallId] || [], reflectCardHtml, '還沒有人填寫');
}
function starsHtml(n) {
  n = Math.max(0, Math.min(5, Number(n) || 0));
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}
function screeningBlock(d) {
  const s = d._screening;
  if (!s || !s.stars) return '';
  return `<div class="ai-feedback"><span class="ai-stars">${starsHtml(s.stars)}</span>${s.suggestion ? `<span class="ai-note">${escapeHtml(s.suggestion)}</span>` : ''}</div>`;
}
function shareCardHtml(d) {
  return `<div class="rcard"><div class="rc-head">${escapeHtml(d.nickname||'匿名')}</div><div class="rc-row" style="white-space:pre-wrap;line-height:1.6">${linkify(escapeHtml(d.content||''))}</div>${screeningBlock(d)}</div>`;
}
function reflectCardHtml(d) {
  return `<div class="rcard">
      <div class="rc-head">${escapeHtml(d.nickname||'匿名')}</div>
      <div class="rc-row"><b>Reflection</b>${escapeHtml(d.r1||'')}</div>
      <div class="rc-row"><b>Feeling</b>${escapeHtml(d.r2||'')}</div>
      <div class="rc-row"><b>Finding</b>${escapeHtml(d.r3||'')}</div>
      <div class="rc-row"><b>Future</b>${escapeHtml(d.r4||'')}</div>
    </div>`;
}
function shareCardHtmlNumbered(d, i) {
  return `<div class="rcard"><div class="rc-head"><span class="rc-num">#${i+1}</span>${escapeHtml(d.nickname||'匿名')}</div><div class="rc-row" style="white-space:pre-wrap;line-height:1.6">${linkify(escapeHtml(d.content||''))}</div>${screeningBlock(d)}</div>`;
}
function featuredCardHtml(d) {
  return `<div class="rcard featured"><div class="rc-head"><span class="featured-badge">🌟精選</span>${escapeHtml(d.nickname||'匿名')}</div><div class="rc-row" style="white-space:pre-wrap;line-height:1.6">${linkify(escapeHtml(d.content||''))}</div>${screeningBlock(d)}</div>`;
}
function reflectCardHtmlNumbered(d, i) {
  return `<div class="rcard">
      <div class="rc-head"><span class="rc-num">#${i+1}</span>${escapeHtml(d.nickname||'匿名')}</div>
      <div class="rc-row"><b>Reflection</b>${escapeHtml(d.r1||'')}</div>
      <div class="rc-row"><b>Feeling</b>${escapeHtml(d.r2||'')}</div>
      <div class="rc-row"><b>Finding</b>${escapeHtml(d.r3||'')}</div>
      <div class="rc-row"><b>Future</b>${escapeHtml(d.r4||'')}</div>
    </div>`;
}

let _wallRawDocs = [];
let _wallScreening = {};

function renderWallWithScreening() {
  const path = document.body.dataset.wallpath;
  const isReflect = path === 'reflections';
  const cardFn = isReflect ? reflectCardHtmlNumbered : shareCardHtmlNumbered;
  const emptyMsg = isReflect ? '還沒有人填寫' : '還沒有人分享';
  const docs = _wallRawDocs.map(d => ({...d, _screening: _wallScreening[d._id]}));
  docs.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0)); // 依送出先後排序、從第一筆開始編號
  renderPagedWall('wallFull', docs, cardFn, emptyMsg);
  const countEl = document.getElementById('wallFullCount');
  if (countEl) countEl.textContent = `共 ${docs.length} 則`;
  const featuredEl = document.getElementById('wallFeatured');
  const featuredSection = document.getElementById('featuredSection');
  if (featuredEl && !isReflect) {
    const featured = docs.filter(d => d._screening && d._screening.stars >= 4)
      .sort((a,b) => (b._screening.stars - a._screening.stars) || ((b.updatedAt||0) - (a.updatedAt||0)))
      .slice(0, 6);
    featuredEl.innerHTML = featured.map(featuredCardHtml).join('');
    if (featuredSection) featuredSection.hidden = !featured.length;
  }
}

function initWallPage() {
  const path = document.body.dataset.wallpath;
  if (!path) return;
  const isReflect = path === 'reflections';
  db.ref(`${ROOT}/${path}`).on('value', snap => {
    const val = snap.val() || {};
    _wallRawDocs = Object.entries(val).map(([id, v]) => ({...v, _id: id}));
    renderWallWithScreening();
  });
  if (!isReflect) {
    db.ref(`${ROOT}/screening/${path}`).on('value', snap => {
      _wallScreening = snap.val() || {};
      renderWallWithScreening();
    });
  }
}

function initQR() {
  const el = document.getElementById('qrcode');
  if (!el || typeof QRCode === 'undefined') return;
  try {
    new QRCode(el, { text: window.location.origin + window.location.pathname.replace(/[^/]*$/, 'index.html'), width: 92, height: 92, colorDark: '#2b2820', colorLight: '#ffffff' });
  } catch(e) {}
}

let lastRosterDocs = [];

function elapsedLabel(fromTs) {
  if (!fromTs) return '';
  const mins = Math.max(0, Math.floor((Date.now() - fromTs) / 60000));
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時${mins % 60}分`;
}

const IDLE_AFTER_MS = 2 * 60 * 1000;    // 超過2分鐘沒動作 → 沒在動作
const OFFLINE_AFTER_MS = 10 * 60 * 1000; // 超過10分鐘沒動作 → 已離線（沒有心跳機制，這是用最後動作時間推估）

function presenceHtml(d) {
  const sinceAction = Date.now() - (d.updatedAt || 0);
  const elapsed = elapsedLabel(d.joinedAt || d.updatedAt);
  if (sinceAction < IDLE_AFTER_MS) return { cls: 'live', label: `●上線${elapsed}` };
  if (sinceAction < OFFLINE_AFTER_MS) return { cls: 'idle', label: '◐沒在動作' };
  return { cls: 'offline', label: `○已離線${elapsedLabel(d.updatedAt)}` };
}

function rosterPersonHtml(d) {
  const prog = Object.keys(d.progress||{}).map(Number);
  const dots = [1,2,3,4].map(m => `<span class="pdot ${prog.includes(m)?'on':''}"></span>`).join('');
  const pres = presenceHtml(d);
  return `
    <div class="rperson">
      <span class="name">${escapeHtml(d.nickname||'')} <span class="status-pill ${pres.cls}">${pres.label}</span></span>
      <span class="unit">${escapeHtml(d.unit||'')}</span>
      <span class="task"><span class="progress-dots">${dots}</span></span>
      <span class="ans">${escapeHtml(MOD_NAMES[Math.max(...prog,0)] || '尚未開始')}</span>
    </div>`;
}

function renderRosterList(wallId) {
  renderPagedWall(wallId, wallData[wallId] || [], rosterPersonHtml, '目前還沒有人加入現場看板');
}

function statsHtml(docs) {
  const counts = {1:0,2:0,3:0,4:0};
  docs.forEach(d => Object.keys(d.progress||{}).forEach(m => { m = Number(m); if(counts[m]!==undefined) counts[m]++; }));
  return [1,2,3,4].map(m => `
    <div class="tstat"><div class="n">${counts[m]}<small style="font-size:12px;color:var(--muted)">/${docs.length||0}</small></div><div class="l">${MOD_NAMES[m]}</div></div>
  `).join('');
}

let rosterSortMode = 'recent';

function progCount(d) { return Object.keys(d.progress||{}).length; }
function onlineMs(d) { return Date.now() - (d.joinedAt || d.updatedAt || 0); }

const ROSTER_SORTERS = {
  recent: (a, b) => (b.updatedAt||0) - (a.updatedAt||0),
  modules: (a, b) => progCount(b) - progCount(a) || (b.updatedAt||0) - (a.updatedAt||0),
  elapsed: (a, b) => onlineMs(b) - onlineMs(a),
};

function renderRoster(data) {
  const docs = data ? Object.values(data) : [];
  lastRosterDocs = docs;
  docs.sort(ROSTER_SORTERS[rosterSortMode] || ROSTER_SORTERS.recent);
  const am = docs.filter(d => d.session !== 'pm');
  const pm = docs.filter(d => d.session === 'pm');

  const statsAM = document.getElementById('teacherStatsAM');
  const statsPM = document.getElementById('teacherStatsPM');
  if (statsAM) statsAM.innerHTML = statsHtml(am);
  if (statsPM) statsPM.innerHTML = statsHtml(pm);
  const countAM = document.getElementById('countAM');
  const countPM = document.getElementById('countPM');
  if (countAM) countAM.textContent = `${am.length} 人`;
  if (countPM) countPM.textContent = `${pm.length} 人`;

  if (document.getElementById('rosterListAM')) renderPagedWall('rosterListAM', am, rosterPersonHtml, '上午場目前還沒有人加入');
  if (document.getElementById('rosterListPM')) renderPagedWall('rosterListPM', pm, rosterPersonHtml, '下午場目前還沒有人加入');
  // 舊版單一清單相容（若頁面上還留著單一 #rosterList 就用全部人）
  if (document.getElementById('rosterList')) renderPagedWall('rosterList', docs, rosterPersonHtml, '目前還沒有人加入現場看板');
}

function renderModuleCount(data) {
  const modNum = Number(document.body.dataset.module);
  const el = document.getElementById('moduleCount');
  if (!modNum || !el) return;
  const docs = data ? Object.values(data) : [];
  const done = docs.filter(d => d.progress && d.progress[modNum]);
  const am = done.filter(d => d.session !== 'pm').length;
  const pm = done.filter(d => d.session === 'pm').length;
  el.textContent = `✅ 已完成本模組：上午 ${am} 人／下午 ${pm} 人`;
}

function docsOf(val) {
  return val ? Object.values(val).sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0)) : [];
}

let lastRosterRaw = null;

function initSortControls() {
  const row = document.getElementById('rosterSortRow');
  if (!row) return;
  row.querySelectorAll('.sortbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      rosterSortMode = btn.dataset.sort;
      row.querySelectorAll('.sortbtn').forEach(b => b.classList.toggle('active', b === btn));
      if (lastRosterRaw) renderRoster(lastRosterRaw);
    });
  });
}

function initListeners() {
  db.ref(`${ROOT}/roster`).on('value', snap => { lastRosterRaw = snap.val(); renderRoster(lastRosterRaw); renderModuleCount(lastRosterRaw); });
  setInterval(() => { if (lastRosterRaw) renderRoster(lastRosterRaw); }, 30000);
  db.ref(`${ROOT}/reflections`).on('value', snap => { const docs = docsOf(snap.val()); renderPagedWall('reflectWall', docs, reflectCardHtml, '還沒有人填寫'); updateTeaserCount('reflectWallCount', docs.length); });
  db.ref(`${ROOT}/practice_log`).on('value', snap => { const docs = docsOf(snap.val()); renderPagedWall('practiceWall', docs, shareCardHtml, '還沒有人分享'); updateTeaserCount('practiceWallCount', docs.length); });
  db.ref(`${ROOT}/share2`).on('value', snap => { const docs = docsOf(snap.val()); renderPagedWall('shareWall2', docs, shareCardHtml, '還沒有人分享'); updateTeaserCount('shareWall2Count', docs.length); });
  db.ref(`${ROOT}/share3`).on('value', snap => { const docs = docsOf(snap.val()); renderPagedWall('shareWall3', docs, shareCardHtml, '還沒有人分享'); updateTeaserCount('shareWall3Count', docs.length); });
  const pill = document.getElementById('connPill');
  if (pill) pill.textContent = '● 即時連線中';
}

function logout() {
  try {
    localStorage.removeItem('nacs0914_myid');
    localStorage.removeItem('nacs0914_nickname');
    localStorage.removeItem('nacs0914_session');
    localStorage.removeItem('nacs0914_gate_ok'); // 換人要重新走一次密碼+暱稱畫面
  } catch(e) {}
  location.href = 'index.html';
}
window.logout = logout;

function setupJoin() {
  const btn = document.getElementById('btnJoin');
  if (!btn) return;
  // 若已加入過，還原狀態
  if (myNickname) {
    const joinRow = document.getElementById('joinRow');
    const progressRow = document.getElementById('progressRow');
    if (joinRow) joinRow.style.display = 'none';
    if (progressRow) progressRow.hidden = false;
  }
  btn.addEventListener('click', () => {
    const nickname = document.getElementById('inName').value.trim();
    const unit = document.getElementById('inUnit').value.trim();
    if (!nickname) return;
    myNickname = nickname;
    try { localStorage.setItem('nacs0914_nickname', nickname); } catch(e) {}
    db.ref(`${ROOT}/roster/${myId}`).update({ nickname, unit, updatedAt: Date.now() });
    document.getElementById('joinRow').style.display = 'none';
    const pr = document.getElementById('progressRow');
    if (pr) pr.hidden = false;
  });
}

function initModuleProgress() {
  const btns = document.querySelectorAll('.modbtn[data-m]');
  if (!btns.length) return;
  db.ref(`${ROOT}/roster/${myId}/progress`).on('value', snap => {
    const prog = snap.val() || {};
    btns.forEach(btn => {
      btn.classList.toggle('on', !!prog[btn.dataset.m]);
    });
  });
}

function setupMarkDone() {
  document.querySelectorAll('.modbtn[data-m]').forEach(btn => {
    const m = btn.dataset.m;
    // 讀取初始狀態
    db.ref(`${ROOT}/roster/${myId}/progress/${m}`).once('value').then(snap => {
      btn.classList.toggle('on', !!snap.val());
    });
    btn.addEventListener('click', async () => {
      const ref = db.ref(`${ROOT}/roster/${myId}/progress/${m}`);
      const cur = await ref.once('value');
      const next = !cur.val();
      await ref.set(next);
      await db.ref(`${ROOT}/roster/${myId}/updatedAt`).set(Date.now());
      if (myNickname) await db.ref(`${ROOT}/roster/${myId}/nickname`).set(myNickname).catch(()=>{});
      btn.classList.toggle('on', next);
    });
  });
}

// 輸入過的內容自動存草稿到localStorage，避免重整/切頁遺失還沒送出的內容
function bindDraft(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const key = 'nacs0914_draft_' + id;
  try {
    const saved = localStorage.getItem(key);
    if (saved && !el.value) el.value = saved;
  } catch(e) {}
  el.addEventListener('input', () => {
    try { localStorage.setItem(key, el.value); } catch(e) {}
  });
}
function clearDraft(id) {
  try { localStorage.removeItem('nacs0914_draft_' + id); } catch(e) {}
}

function setupShareBox(path, textareaId, btnId, statusId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  bindDraft(textareaId);
  btn.addEventListener('click', async () => {
    const input = document.getElementById(textareaId);
    const text = input.value.trim();
    if (!text) return;
    const statusEl = document.getElementById(statusId);
    btn.disabled = true;
    statusEl.textContent = '⏳ 送出中…';
    try {
      await db.ref(`${ROOT}/${path}/${myId}_${Date.now()}`).set({
        nickname: myNickname || '匿名', content: text, updatedAt: Date.now()
      });
      statusEl.textContent = '✅ 已記錄，謝謝分享！';
      input.value = '';
      clearDraft(textareaId);
    } catch (e) {
      statusEl.textContent = '❌ ' + (e.message || '發生錯誤，稍後再試一次');
    } finally {
      btn.disabled = false;
    }
  });
}

function initSubmissionFeedback(collection, afterElId) {
  const afterEl = document.getElementById(afterElId);
  if (!afterEl) return;
  let box = null;
  db.ref(`${ROOT}/screening/${collection}`).on('value', snap => {
    const all = snap.val() || {};
    const mine = Object.keys(all).filter(k => k.startsWith(myId + '_')).sort();
    if (!box) {
      box = document.createElement('div');
      box.className = 'fb-note';
      box.hidden = true;
      afterEl.insertAdjacentElement('afterend', box);
    }
    if (!mine.length) { box.hidden = true; return; }
    const latest = all[mine[mine.length - 1]];
    const fs = latest.fetchStatus;
    if (!fs || fs === 'ok') { box.hidden = true; return; }
    box.hidden = false;
    if (fs === 'unreadable_js_app' || fs === 'requires_google_login') {
      box.className = 'fb-note fb-info';
      box.textContent = 'ℹ️ AI掃描讀不到這類分享頁的內容細節（技術限制），格式已確認沒問題，老師會另外人工看過，不影響你的繳交。';
    } else if (fs === 'not_a_url') {
      box.className = 'fb-note fb-warn';
      box.textContent = '⚠️ 你貼的內容看起來不是網址連結，記得貼「分享連結」網址喔！';
    } else {
      box.className = 'fb-note fb-warn';
      box.textContent = '⚠️ AI掃描目前讀不到你的分享連結內容，可能是連結錯誤或分享設定沒開，麻煩檢查一下（設成「知道連結的人都能查看」）後重新送出。';
    }
  });
}

function setupReflect() {
  const btn = document.getElementById('btnReflect');
  if (!btn) return;
  ['rf1','rf2','rf3','rf4'].forEach(bindDraft);
  btn.addEventListener('click', async () => {
    const r1 = document.getElementById('rf1').value.trim();
    const r2 = document.getElementById('rf2').value.trim();
    const r3 = document.getElementById('rf3').value.trim();
    const r4 = document.getElementById('rf4').value.trim();
    if (!r1 && !r2 && !r3 && !r4) return;
    const nickname = myNickname || '匿名';
    try {
      await db.ref(`${ROOT}/reflections/${myId}`).set({ nickname, r1, r2, r3, r4, updatedAt: Date.now() });
    } catch(e) {}
    const old = btn.textContent;
    btn.textContent = '已送出 ✓';
    setTimeout(() => { btn.textContent = old; }, 1800);
  });
}

function copyPrompt(btn) {
  const box = btn.closest('.promptbox');
  const text = box.querySelector('.ptxt').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = '已複製';
    setTimeout(() => { btn.textContent = old; }, 1500);
  }).catch(() => {});
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function initTimer() {
  const modNum = document.body.dataset.module;
  const el = document.getElementById('moduleTimer');
  if (!modNum || !el) return;
  let seconds = 0;
  let unwritten = 0;
  const path = `${ROOT}/timing/${myId}/module${modNum}`;
  el.textContent = '⏱ 00:00';
  const tick = setInterval(() => {
    seconds++; unwritten++;
    el.textContent = '⏱ ' + fmtTime(seconds);
    if (unwritten >= 5) {
      const delta = unwritten;
      unwritten = 0;
      db.ref(path).transaction(cur => (cur || 0) + delta);
    }
  }, 1000);
  const flush = () => {
    if (unwritten > 0) {
      const delta = unwritten;
      unwritten = 0;
      db.ref(path).transaction(cur => (cur || 0) + delta);
    }
  };
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

const GATE_CODE = '4190'; // 明天日期(09/14)反過來

function initGate() {
  const gate = document.getElementById('gate');
  const content = document.getElementById('pageContent');
  if (!gate || !content) return; // 這頁沒有設閘門就跳過
  const passed = localStorage.getItem('nacs0914_gate_ok') === '1';
  if (passed) {
    gate.hidden = true; content.hidden = false;
    return;
  }
  gate.hidden = false; content.hidden = true;
  const input = document.getElementById('gatePass');
  const btn = document.getElementById('gateBtn');
  const status = document.getElementById('gateStatus');
  const nameInput = document.getElementById('inName');
  const unitInput = document.getElementById('inUnit');
  bindDraft('inName');
  bindDraft('inUnit');
  const sesBtns = document.querySelectorAll('.sesbtn');
  let selectedSession = 'am';
  sesBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.s === selectedSession);
    b.addEventListener('click', () => {
      selectedSession = b.dataset.s;
      sesBtns.forEach(x => x.classList.toggle('active', x === b));
    });
  });
  const tryEnter = () => {
    if ((input.value || '').trim() !== GATE_CODE) {
      status.textContent = '密碼不對，請問講師';
      return;
    }
    if (nameInput && !nameInput.value.trim()) {
      status.textContent = '請輸入暱稱才能進入';
      return;
    }
    try { localStorage.setItem('nacs0914_gate_ok', '1'); } catch(e) {}
    if (nameInput) {
      const nickname = nameInput.value.trim();
      const unit = (unitInput && unitInput.value.trim()) || '';
      myNickname = nickname;
      mySession = selectedSession;
      try {
        localStorage.setItem('nacs0914_nickname', nickname);
        localStorage.setItem('nacs0914_session', mySession);
      } catch(e) {}
      db.ref(`${ROOT}/roster/${myId}`).update({ nickname, unit, session: mySession, updatedAt: Date.now(), joinedAt: Date.now() });
    }
    gate.hidden = true; content.hidden = false;
  };
  btn.addEventListener('click', tryEnter);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });
  if (unitInput) unitInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });
}

document.addEventListener('DOMContentLoaded', () => {
  initGate();
  initQR();
  initListeners();
  initSortControls();
  initWallPage();
  setupJoin();
  if (document.body.dataset.module) setupMarkDone(); // 只在模組頁綁「標記完成」，index的模組卡是純導覽連結
  initModuleProgress(); // index/模組頁的導覽按鈕都依進度顯示實心樣式
  setupShareBox('practice_log', 'ownPromptInput', 'btnOwnPrompt', 'ownPromptStatus');
  setupShareBox('share2', 'shareInput2', 'btnShare2', 'shareStatus2');
  setupShareBox('share3', 'shareInput3', 'btnShare3', 'shareStatus3');
  initSubmissionFeedback('practice_log', 'ownPromptStatus');
  initSubmissionFeedback('share2', 'shareStatus2');
  initSubmissionFeedback('share3', 'shareStatus3');
  setupReflect();
  initTimer();
});
