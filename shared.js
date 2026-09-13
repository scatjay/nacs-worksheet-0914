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

const MOD_NAMES = {1:'模組1 STAR', 2:'模組2 NotebookLM', 3:'模組3 海報', 4:'模組4 反思'};

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initQR() {
  const el = document.getElementById('qrcode');
  if (!el || typeof QRCode === 'undefined') return;
  try {
    new QRCode(el, { text: window.location.origin + window.location.pathname.replace(/[^/]*$/, 'index.html'), width: 92, height: 92, colorDark: '#2b2820', colorLight: '#ffffff' });
  } catch(e) {}
}

function renderRoster(data) {
  const list = document.getElementById('rosterList');
  const docs = data ? Object.values(data) : [];
  const statsEl = document.getElementById('teacherStats');
  if (statsEl) {
    const counts = {1:0,2:0,3:0,4:0};
    docs.forEach(d => Object.keys(d.progress||{}).forEach(m => { m = Number(m); if(counts[m]!==undefined) counts[m]++; }));
    statsEl.innerHTML = [1,2,3,4].map(m => `
      <div class="tstat"><div class="n">${counts[m]}<small style="font-size:12px;color:var(--muted)">/${docs.length||0}</small></div><div class="l">${MOD_NAMES[m]}</div></div>
    `).join('');
  }
  if (!list) return;
  if (!docs.length) {
    list.innerHTML = '<div class="empty-note">目前還沒有人加入現場看板</div>';
    return;
  }
  docs.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  list.innerHTML = docs.map(d => {
    const prog = Object.keys(d.progress||{}).map(Number);
    const dots = [1,2,3,4].map(m => `<span class="pdot ${prog.includes(m)?'on':''}"></span>`).join('');
    return `
    <div class="rperson">
      <span class="name">${escapeHtml(d.nickname||'')} <span class="status-pill live">●上線</span></span>
      <span class="unit">${escapeHtml(d.unit||'')}</span>
      <span class="task"><span class="progress-dots">${dots}</span></span>
      <span class="ans">${escapeHtml(MOD_NAMES[Math.max(...prog,0)] || '尚未開始')}</span>
    </div>`;
  }).join('');
}

function renderShareWall(data, wallId) {
  const wall = document.getElementById(wallId);
  if (!wall) return;
  const docs = data ? Object.values(data) : [];
  if (!docs.length) {
    wall.innerHTML = '<div class="empty-note">還沒有人分享</div>';
    return;
  }
  docs.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  wall.innerHTML = docs.map(d => `
    <div class="rcard">
      <div class="rc-head">${escapeHtml(d.nickname||'匿名')}</div>
      <div class="rc-row" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(d.content||'')}</div>
    </div>
  `).join('');
}

function renderReflections(data) {
  const wall = document.getElementById('reflectWall');
  if (!wall) return;
  const docs = data ? Object.values(data) : [];
  if (!docs.length) {
    wall.innerHTML = '<div class="empty-note">還沒有人填寫</div>';
    return;
  }
  docs.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  wall.innerHTML = docs.map(d => `
    <div class="rcard">
      <div class="rc-head">${escapeHtml(d.nickname||'匿名')}</div>
      <div class="rc-row"><b>Reflection</b>${escapeHtml(d.r1||'')}</div>
      <div class="rc-row"><b>Feeling</b>${escapeHtml(d.r2||'')}</div>
      <div class="rc-row"><b>Finding</b>${escapeHtml(d.r3||'')}</div>
      <div class="rc-row"><b>Future</b>${escapeHtml(d.r4||'')}</div>
    </div>
  `).join('');
}

function initListeners() {
  db.ref(`${ROOT}/roster`).on('value', snap => renderRoster(snap.val()));
  db.ref(`${ROOT}/reflections`).on('value', snap => renderReflections(snap.val()));
  db.ref(`${ROOT}/practice_log`).on('value', snap => renderShareWall(snap.val(), 'practiceWall'));
  db.ref(`${ROOT}/share2`).on('value', snap => renderShareWall(snap.val(), 'shareWall2'));
  db.ref(`${ROOT}/share3`).on('value', snap => renderShareWall(snap.val(), 'shareWall3'));
  const pill = document.getElementById('connPill');
  if (pill) pill.textContent = '● 即時連線中';
}

function logout() {
  try {
    localStorage.removeItem('nacs0914_myid');
    localStorage.removeItem('nacs0914_nickname');
    localStorage.removeItem('nacs0914_gate_ok'); // 換人要重新走一次密碼+暱稱畫面
  } catch(e) {}
  location.href = 'index.html';
}

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

function setupShareBox(path, textareaId, btnId, statusId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
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
    } catch (e) {
      statusEl.textContent = '❌ ' + (e.message || '發生錯誤，稍後再試一次');
    } finally {
      btn.disabled = false;
    }
  });
}

function setupReflect() {
  const btn = document.getElementById('btnReflect');
  if (!btn) return;
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
      try { localStorage.setItem('nacs0914_nickname', nickname); } catch(e) {}
      db.ref(`${ROOT}/roster/${myId}`).update({ nickname, unit, updatedAt: Date.now() });
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
  setupJoin();
  if (document.body.dataset.module) setupMarkDone(); // 只在模組頁綁「標記完成」，index的模組卡是純導覽連結
  setupShareBox('practice_log', 'ownPromptInput', 'btnOwnPrompt', 'ownPromptStatus');
  setupShareBox('share2', 'shareInput2', 'btnShare2', 'shareStatus2');
  setupShareBox('share3', 'shareInput3', 'btnShare3', 'shareStatus3');
  setupReflect();
  initTimer();
});
