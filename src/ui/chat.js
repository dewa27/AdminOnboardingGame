// Episode 2 — WhatsApp-style chat overlay.
//
// Faithful port of the multi-chat / patience / trial scheduling logic from
// the original prototype, but lifted out of the DOM-rendering mix so it's
// easier to extend (e.g. swapping in a real WebSocket later).
//
// Public API:
//   startEpisode2(scene, onDone)
//     - resets gameState.episode2
//     - mounts the WA UI on top of the Phaser scene
//     - calls onDone() when all four customers have ended
//
// Mechanic recap (.md §4, §5, §6):
//   - Each customer has patience (drops every time admin replies to anyone
//     else; resets when a new customer message arrives).
//   - Each reply choice has a quality score 1..4. The mean score across the
//     conversation (before trial) determines commitment (>= 3.6 = 'high').
//   - Reaching 'trial' shows slot buttons. The slot must be available for
//     the customer AND have remaining capacity, otherwise the trial fails.
//     If no compatible slot remains, the customer ends with reason
//     'gagal_jadwal'.
import { overlay } from './overlay.js';
import { gameState } from '../state/gameState.js';
import { saveGame } from '../state/storage.js';
import { customers, customerOrder, patienceBase } from '../data/customers.js';

let ep2State = {};
let ep2ActiveKey = null;

export function startEpisode2(_scene, onDone) {
  // Reset shared state — Episode 2 might be entered multiple times if we
  // add a "replay" button later.
  gameState.episode2.customers = {};
  gameState.episode2.slots.s1.used = 0;
  gameState.episode2.slots.s2.used = 0;
  gameState.episode2.slots.s3.used = 0;

  ep2State = {};
  customerOrder.forEach(key => {
    const c = customers[key];
    ep2State[key] = {
      nodeId: c.start,
      scores: [],
      log: [{ who: 'customer', text: c.nodes[c.start].text }],
      patience: patienceBase[key],
      base: patienceBase[key],
      awaitingReply: true,
      status: 'active',
      endType: null,
      trialIntroShown: false,
      slotFeedback: null,
      commitment: null
    };
  });
  ep2ActiveKey = 'sarah';

  // Phaser scene reference isn't used much yet, but the parameter is here
  // so we can wire things like "press E on laptop to focus the next pending
  // customer" in the future.
  render(onDone);
}

// ---------- Helpers ----------

function activeCustomersLeft() {
  return customerOrder.filter(k => ep2State[k].status === 'active');
}

function urgencyClass(st) {
  if (st.status !== 'active') return 'calm';
  const ratio = st.patience / st.base;
  if (ratio >= 0.66) return 'calm';
  if (ratio >= 0.34) return 'warn';
  return 'critical';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tickOthers(excludeKey) {
  customerOrder.forEach(key => {
    if (key === excludeKey) return;
    const st = ep2State[key];
    if (st.status !== 'active' || !st.awaitingReply) return;
    st.patience -= 1;
    if (st.patience <= 0) {
      st.status = 'ended';
      st.endType = 'left_impatient';
      st.awaitingReply = false;
      st.log.push({
        who: 'system',
        text: `${customers[key].name} udah nunggu kelamaan dan memutuskan pergi tanpa dibales.`
      });
      gameState.episode2.customers[key] = { registered: false, reason: 'ditinggal_lama' };
      saveGame(gameState);
    }
  });
}

function handleEnding(key, outcome) {
  const c = customers[key];
  const st = ep2State[key];
  st.status = 'ended';
  if (outcome === 'soft_fail') {
    st.endType = 'soft_fail';
    st.log.push({ who: 'system', text: `${c.name} bilang mau pikir pikir dulu. Belum berhasil dikonversi.` });
    gameState.episode2.customers[key] = { registered: false, reason: 'mikir_dulu' };
  } else {
    st.endType = 'hard_fail';
    st.log.push({ who: 'system', text: `${c.name} kurang puas dan memutuskan gak lanjut.` });
    gameState.episode2.customers[key] = { registered: false, reason: 'pergi' };
  }
  saveGame(gameState);
  tickOthers(key);
}

function checkScheduleDeadEnd(key) {
  const c = customers[key];
  const slots = gameState.episode2.slots;
  const stillPossible = c.availability.some(sid => slots[sid].used < slots[sid].cap);
  if (!stillPossible) {
    const st = ep2State[key];
    st.status = 'ended';
    st.endType = 'schedule_fail';
    st.log.push({
      who: 'system',
      text: `Semua slot yang cocok buat ${c.name} udah penuh. Gagal jadwal walau sebenarnya mau daftar.`
    });
    gameState.episode2.customers[key] = { registered: false, reason: 'gagal_jadwal' };
    saveGame(gameState);
  }
}

// ---------- Render ----------

let render = function (onDone) {
  if (activeCustomersLeft().length === 0) {
    // Hand control back to Episode 2 scene's onDone.
    setTimeout(() => {
      overlay.hide();
      onDone && onDone();
    }, 600);
    return;
  }
  if (!ep2State[ep2ActiveKey] || ep2State[ep2ActiveKey].status !== 'active') {
    ep2ActiveKey = activeCustomersLeft()[0];
  }

  const c = customers[ep2ActiveKey];
  const st = ep2State[ep2ActiveKey];

  // Vertical contact list (left column) — one row per customer, WhatsApp
  // style: avatar, name, a one-line preview of the last message, and an
  // urgency dot instead of a timestamp.
  const listHtml = customerOrder.map(key => {
    const s = ep2State[key];
    const cc = customers[key];
    const initial = cc.name.replace(/^(Ibu|Pak|Kak|Bu)\s/, '')[0];
    const classes = ['wa-contact'];
    if (key === ep2ActiveKey) classes.push('selected');
    if (s.status !== 'active') classes.push('ended');

    const lastMsg = s.log[s.log.length - 1];
    const preview = lastMsg
      ? (lastMsg.who === 'admin' ? 'Kamu: ' : '') + lastMsg.text
      : '';

    return `
      <div class="${classes.join(' ')}" data-tab="${key}">
        <div class="avatar">${initial}</div>
        <div class="contact-info">
          <div class="contact-top">
            <span class="name">${escapeHtml(cc.name)}</span>
            ${s.status === 'active' ? `<span class="urgency-dot ${urgencyClass(s)}"></span>` : ''}
          </div>
          <div class="preview">${escapeHtml(preview)}</div>
        </div>
      </div>`;
  }).join('');

  const bodyHtml = st.log.map(l => {
    if (l.who === 'system') return `<div class="bubble system">${escapeHtml(l.text)}</div>`;
    const tag = l.who === 'customer' ? `<div class="customer-tag">${escapeHtml(c.name)}</div>` : '';
    return `<div class="bubble ${l.who}">${tag}${escapeHtml(l.text)}</div>`;
  }).join('');

  let replyArea = '';
  if (st.status !== 'active') {
    const cls = st.endType === 'registered' ? 'good'
              : st.endType === 'soft_fail' ? 'warn'
              : 'bad';
    replyArea = `<div class="feedback ${cls}">Chat ini sudah selesai.</div>`;
  } else if (st.nodeId === 'trial') {
    replyArea = renderTrialArea(ep2ActiveKey);
  } else if (st.nodeId === 'fail_soft' || st.nodeId === 'fail_hard') {
    handleEnding(ep2ActiveKey, st.nodeId === 'fail_soft' ? 'soft_fail' : 'hard_fail');
    return render(onDone);
  } else {
    const node = c.nodes[st.nodeId];
    const shuffled = shuffle(node.options.map((o, i) => ({ ...o, idx: i })));
    replyArea = shuffled.map(o =>
      `<button class="choice" data-pick="${o.idx}">${escapeHtml(o.text)}</button>`
    ).join('');
  }

  overlay.show(`
    <div class="ov-frame">
      <div class="ov-topbar">
        <span>TIMEDOOR ACADEMY — WA ADMIN</span>
        <span class="badge">EP2</span>
      </div>
      <div class="wa-app">
        <div class="wa-sidebar">
          <div class="wa-sidebar-header">Chats</div>
          <div class="wa-contact-list">${listHtml}</div>
        </div>
        <div class="wa-chat-pane">
          <div class="wa-header">
            <span>${escapeHtml(c.name)}</span>
            <span class="patience-label">${
              st.status !== 'active' ? 'chat selesai'
              : st.awaitingReply ? 'sedang menunggu balasan'
              : 'santai'
            }</span>
          </div>
          <div class="wa-body" id="wa-body">${bodyHtml}</div>
          <div class="wa-reply-area">${replyArea}</div>
        </div>
      </div>
    </div>
  `);

  // Bind tab clicks.
  document.querySelectorAll('#overlay [data-tab]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.getAttribute('data-tab');
      if (ep2State[k].status !== 'active') return; // don't reopen ended chats
      ep2ActiveKey = k;
      render(onDone);
    });
  });

  // Bind reply choices.
  document.querySelectorAll('#overlay [data-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-pick'), 10);
      ep2Pick(ep2ActiveKey, idx, onDone);
    });
  });

  // Bind slot buttons.
  document.querySelectorAll('#overlay [data-offer-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slotId = btn.getAttribute('data-offer-slot');
      ep2OfferSlot(ep2ActiveKey, slotId, onDone);
    });
  });

  // Auto-scroll chat to bottom.
  const body = document.getElementById('wa-body');
  if (body) body.scrollTop = body.scrollHeight;
};

function renderTrialArea(key) {
  const c = customers[key];
  const st = ep2State[key];

  if (!st.trialIntroShown) {
    st.trialIntroShown = true;
    st.log.push({
      who: 'customer',
      text: `Oh oke, boleh juga dicoba dulu. Ngomong-ngomong, ${c.availLine}. Kira kira ada slot kosong kapan ya?`
    });
  }

  const avg = st.scores.reduce((a, b) => a + b, 0) / st.scores.length;
  st.commitment = avg >= 3.6 ? 'high' : 'low';

  const slots = gameState.episode2.slots;
  const slotsHtml = Object.entries(slots).map(([id, s]) => `
    <button class="slot-btn" data-offer-slot="${id}" ${s.used >= s.cap ? 'disabled' : ''}>
      ${escapeHtml(s.label)} <span class="cap">${s.cap - s.used}/${s.cap} slot sisa</span>
    </button>
  `).join('');

  const feedback = st.slotFeedback
    ? `<div class="feedback ${st.slotFeedback.type}">${escapeHtml(st.slotFeedback.text)}</div>`
    : '';

  return `
    <div style="font-size:11.5px; margin-bottom:8px; font-weight:bold;">Tawarkan slot trial:</div>
    <div class="slotbox">${slotsHtml}</div>
    ${feedback}
  `;
}

// ---------- Player actions ----------

function ep2Pick(key, idx, onDone) {
  const c = customers[key];
  const st = ep2State[key];
  const node = c.nodes[st.nodeId];
  const chosen = node.options[idx];
  st.scores.push(chosen.score);
  st.log.push({ who: 'admin', text: chosen.text });

  const nextId = chosen.next;
  if (nextId === 'trial') {
    st.nodeId = 'trial';
    st.awaitingReply = false;
  } else if (nextId === 'fail_soft' || nextId === 'fail_hard') {
    st.nodeId = nextId;
    st.awaitingReply = false;
  } else {
    const nextNode = c.nodes[nextId];
    st.log.push({ who: 'customer', text: nextNode.text });
    st.nodeId = nextId;
    st.awaitingReply = true;
    st.patience = st.base;
  }

  tickOthers(key);
  render(onDone);
}

function ep2OfferSlot(key, slotId, onDone) {
  const c = customers[key];
  const st = ep2State[key];
  const slots = gameState.episode2.slots;
  const slot = slots[slotId];

  if (slot.used >= slot.cap) {
    st.slotFeedback = { type: 'bad', text: `${slot.label} sudah penuh, coba tawarkan sesi lain.` };
    tickOthers(key);
    checkScheduleDeadEnd(key);
    return render(onDone);
  }
  if (!c.availability.includes(slotId)) {
    st.slotFeedback = { type: 'bad', text: `${c.name} gak bisa di jadwal itu. Coba cek lagi ketersediaannya.` };
    tickOthers(key);
    checkScheduleDeadEnd(key);
    return render(onDone);
  }

  slot.used += 1;
  st.status = 'ended';
  st.endType = 'registered';
  st.log.push({ who: 'system', text: `✅ Terdaftar untuk ${slot.label}.` });
  gameState.episode2.customers[key] = { registered: true, commitment: st.commitment, slot: slotId };
  saveGame(gameState);
  tickOthers(key);
  render(onDone);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}