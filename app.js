'use strict';

const STORAGE_KEY = 'roadtrip_stops';

let stops = load();

const form = document.getElementById('stop-form');
const nameInput = document.getElementById('stop-name');
const dateInput = document.getElementById('stop-date');
const nightsInput = document.getElementById('stop-nights');
const notesInput = document.getElementById('stop-notes');
const stopsList = document.getElementById('stops-list');
const emptyState = document.getElementById('empty-state');
const statStops = document.getElementById('stat-stops');
const statNights = document.getElementById('stat-nights');
const clearBtn = document.getElementById('clear-btn');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  const stop = {
    id: Date.now(),
    name,
    date: dateInput.value || null,
    nights: parseInt(nightsInput.value) || 0,
    notes: notesInput.value.trim(),
  };

  stops.push(stop);
  save();
  render();
  form.reset();
  nameInput.focus();
});

clearBtn.addEventListener('click', () => {
  if (stops.length === 0) return;
  if (!confirm('Tem certeza que quer apagar todas as paradas?')) return;
  stops = [];
  save();
  render();
});

function deleteStop(id) {
  stops = stops.filter(s => s.id !== id);
  save();
  render();
}

function moveStop(id, dir) {
  const idx = stops.findIndex(s => s.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= stops.length) return;
  [stops[idx], stops[newIdx]] = [stops[newIdx], stops[idx]];
  save();
  render();
}

function render() {
  stopsList.innerHTML = '';

  const totalNights = stops.reduce((sum, s) => sum + s.nights, 0);
  statStops.textContent = stops.length;
  statNights.textContent = totalNights;

  emptyState.style.display = stops.length === 0 ? 'block' : 'none';

  stops.forEach((stop, i) => {
    const li = document.createElement('li');
    li.className = 'stop-item';

    const metaParts = [];
    if (stop.date) metaParts.push(formatDate(stop.date));
    if (stop.nights > 0) metaParts.push(`${stop.nights} noite${stop.nights !== 1 ? 's' : ''}`);

    li.innerHTML = `
      <div class="stop-number">${i + 1}</div>
      <div class="stop-info">
        <div class="stop-name">${escHtml(stop.name)}</div>
        ${metaParts.length ? `<div class="stop-meta">${metaParts.join(' · ')}</div>` : ''}
        ${stop.notes ? `<div class="stop-notes">${escHtml(stop.notes)}</div>` : ''}
      </div>
      <div class="stop-actions">
        <button class="btn-icon" title="Mover para cima" data-up="${stop.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn-icon" title="Mover para baixo" data-down="${stop.id}" ${i === stops.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn-icon" title="Remover" data-del="${stop.id}">🗑</button>
      </div>
    `;
    stopsList.appendChild(li);
  });

  stopsList.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => deleteStop(Number(btn.dataset.del))));
  stopsList.querySelectorAll('[data-up]').forEach(btn =>
    btn.addEventListener('click', () => moveStop(Number(btn.dataset.up), -1)));
  stopsList.querySelectorAll('[data-down]').forEach(btn =>
    btn.addEventListener('click', () => moveStop(Number(btn.dataset.down), 1)));
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

render();
