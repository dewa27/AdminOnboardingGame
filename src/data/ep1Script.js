// Episode 1 script — a linear sequence of steps.
//
// Step types:
//   - 'dialogue'   { speaker, text }       — spoken by the NPC, shown as overlay.
//   - 'navigate'   { target, label }        — tells the player which station to walk to.
//   - 'checklist'  { title, items: [...] }   — opens the checklist overlay (see ChecklistView).
//   - 'summary'                              — runs the Episode 1 summary.
//
// Task-type shape intentionally matches the BRP monitoring module target
// (see .md §3) so the same interpreter could drive both episodes.
export const ep1Script = [
  {
    type: 'dialogue',
    speaker: 'Manajer Cabang',
    text: 'Halo! Selamat datang di Timedoor Academy. Kita ini lembaga edtech yang ngajarin coding & teknologi ke anak-anak lewat kelas offline di cabang-cabang, salah satunya di sini.'
  },
  {
    type: 'dialogue',
    speaker: 'Manajer Cabang',
    text: 'Sebelum kelas mulai, tugas pertama kamu: pastikan cabang ini siap menyambut siswa. Yuk ikut saya keliling.'
  },
  {
    type: 'navigate',
    target: 'meja',
    label: 'Meja Stationeries'
  },
  {
    type: 'checklist',
    mode: 'tap',
    title: 'Meja Stationeries',
    items: [
      { id: 'pulpen', name: 'Pulpen' },
      { id: 'kertas', name: 'Kertas' }
    ]
  },
  {
    type: 'navigate',
    target: 'rak',
    label: 'Rak Pajangan'
  },
  {
    type: 'checklist',
    mode: 'tap',
    title: 'Rak Pajangan Merch',
    items: [
      { id: 'kaos', name: 'Kaos' },
      { id: 'tas', name: 'Tas' }
    ]
  },
  {
    type: 'navigate',
    target: 'kelas',
    label: 'Ruang Kelas'
  },
  {
    type: 'checklist',
    mode: 'tap',
    title: 'Ruang Kelas',
    items: [
      { id: 'kursi',   name: 'Kursi lengkap sesuai kapasitas' },
      { id: 'colokan', name: 'Colokan listrik tersedia & berfungsi' },
      { id: 'laptop',  name: 'Laptop tertata rapi di tiap meja' }
    ]
  },
  { type: 'summary' }
];