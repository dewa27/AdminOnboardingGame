// Episode 1 script — a linear sequence of steps.
//
// Step types:
//   - 'dialogue'  { speaker, text }   — spoken by the NPC. `text` may be a
//                                       function of today's day (roster etc.).
//   - 'navigate'  { target, label }   — tells the player which station to walk to.
//   - 'inspect'   { task }            — opens an inspection task (see
//                                       data/ep1Tasks.js and ui/inspect.js).
//   - 'summary'                       — runs the Episode 1 summary.
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
    text: day => `Hari ini kelas mulai jam <strong>${day.classStart}</strong>. Tugas pertama kamu: pastikan cabang siap, mulai dari paket kiriman HQ. Tapi kamu gak cuma centang: <strong>periksa dulu kondisi aslinya, cocokkan sama lembar acuan</strong>, lalu putuskan: bisa kamu beresin sendiri, atau harus dilaporkan ke Ops. Waktu kita terbatas, jadi tentukan mana yang diperiksa duluan.`
  },
  { type: 'navigate', target: 'meja', label: 'Paket HQ di meja resepsionis' },
  { type: 'inspect', task: 'package' },
  { type: 'navigate', target: 'kelas', label: 'Ruang Kelas' },
  { type: 'inspect', task: 'classroom' },
  { type: 'summary' }
];
