# Handover Document: Timedoor Academy Admin Onboarding Simulator

**Status:** Prototype (Episode 1 dan 2 fungsional, belum final)
**Terakhir diupdate:** berdasarkan sesi development terbaru
**File prototype saat ini:** `timedoor-admin-game.html` (single file, jalan langsung di browser tanpa build step)

## 1. Latar Belakang dan Tujuan

Game ini dibuat sebagai tool onboarding untuk Admin Cabang baru di Timedoor Academy. Formatnya simulasi 2D pixelated, bercerita tentang hari pertama seorang Admin bekerja. Tujuannya melatih pemahaman terhadap SOP dan pengambilan keputusan lewat skenario yang mendekati situasi kerja nyata, bukan sekadar membaca materi training.

Sifatnya episodic. Tiap episode adalah satu skenario kasus yang berdiri sendiri, dengan mekanisme gameplay yang bisa dipakai ulang untuk skenario lain di masa depan (termasuk potensi dipakai untuk modul BRP monitoring).

## 2. Tech Stack

### Kondisi saat ini (prototype)
* HTML, CSS, dan vanilla JavaScript dalam satu file, tanpa build tool dan tanpa dependency eksternal
* Rendering UI berbasis manipulasi DOM biasa (bukan canvas)
* State disimpan di objek JavaScript `window.gameState`, hidup selama sesi browser saja (belum ada persistence/database)
* Bisa dibuka langsung dari file lokal atau di-host sebagai static file, tidak butuh server backend

### Rencana pengembangan lanjutan
Untuk kebutuhan karakter yang bisa bergerak bebas di atas tilemap dengan kamera top down (gaya RPG 2D seperti Stardew Valley atau Pokemon), stack akan dipindah ke **Phaser 3**, sebuah game engine JavaScript untuk game 2D berbasis browser. Alasan pemilihan Phaser 3 dibanding alternatif lain:

| Aspek | Phaser 3 | Kaboom.js | Pygame |
|---|---|---|---|
| Platform | Browser (JS) | Browser (JS) | Desktop, butuh install Python |
| Tilemap | Built-in, support format Tiled | Ada, lebih manual | Manual atau library tambahan |
| Collision/fisika | Built-in | Built-in, lebih basic | Manual |
| Animasi sprite | Built-in | Built-in | Manual |
| Cocok untuk kebutuhan share ke banyak admin via link | Ya | Ya | Tidak langsung, perlu install |

Mekanisme dialog, checklist, dan chat yang sudah dibangun (lihat bagian 4 dan 5) akan dipertahankan sebagai overlay UI (HTML/CSS biasa) di atas game canvas Phaser, bukan ikut dipindah ke sistem rendering canvas. Jadi transisinya adalah mengganti bagian pergerakan karakter dan peta, bukan membangun ulang semuanya dari nol.

Asset visual untuk versi ini masih placeholder (kotak warna solid merepresentasikan karakter dan objek), belum pixel art sesungguhnya. Upgrade ke pixel art asli menyusul setelah mekanisme gameplay dan alur cerita dianggap final, dan bisa memanfaatkan skill pembuatan sprite sheet yang sudah tersedia.

## 3. Struktur Episode

### Episode 1: Persiapan Cabang
Skenario hari pertama Admin bekerja. Alurnya:

1. Dialog intro dari Manajer Cabang, penjelasan singkat soal bisnis Timedoor Academy
2. Task pertama diberikan: checklist kesiapan cabang
3. Player menuju tiga lokasi berbeda secara berurutan, masing masing dengan mekanisme checklist berbeda:
   * **Meja Stationeries** (mekanisme drag/tap checklist): item yang dicek adalah pulpen dan kertas
   * **Rak Pajangan Merch** (mekanisme drag/tap checklist): item yang dicek adalah kaos dan tas
   * **Ruang Kelas** (mekanisme tap checklist): kondisi yang dicek adalah kursi lengkap sesuai kapasitas, colokan listrik tersedia dan berfungsi, laptop tertata rapi di tiap meja
4. Setiap item checklist punya dua kemungkinan aksi, bukan sekadar centang benar/salah:
   * **Taruh/Cek OK**, kalau kondisinya memang sudah sesuai
   * **Lapor Kondisi**, kalau ada masalah (stok kurang, rusak, atau belum ada), yang otomatis dicatat sebagai laporan ke tim Ops
5. Summary di akhir episode menampilkan jumlah item lengkap versus jumlah item yang dilaporkan, plus detail tiap laporan

Prinsip desain di balik mekanisme "Lapor Kondisi": admin dilatih untuk tidak diam saja kalau menemukan kondisi yang tidak sesuai, sejalan dengan prinsip escalation path yang berlaku di sistem operasional Timedoor. Task jenis ini juga sengaja dibuat bertipe (`navigate`, `dragdrop/tap checklist`, `dialogue`) agar strukturnya reusable untuk task BRP monitoring nantinya (misalnya modul Attendance Approval Backlog atau Student Status Reconciliation).

### Episode 2: Balas Chat Customer
Skenario masih di hari yang sama, admin mulai kerja di meja dengan laptop, mendapat tugas membalas chat masuk dari calon customer. Formatnya multi chat gaya WhatsApp, di mana empat customer mengirim pesan secara bersamaan dan admin harus memutuskan siapa yang dibalas duluan.

Detail lengkap mekanismenya ada di bagian 4 dan 5 di bawah.

## 4. Sistem Dialog Bercabang (Episode 2)

Setiap customer punya dialogue tree sendiri (bukan template yang sama), dengan struktur:

* Setiap node chat customer punya 3 sampai 4 pilihan balasan
* Tiap pilihan balasan punya skor kualitas dari 1 (terburuk) sampai 4 (terbaik), bukan sekadar benar/salah
* Skor 4 dan 3 sengaja dibuat mirip di permukaan (sama sama terdengar ramah dan informatif), bedanya ada di detail pendekatan seperti urutan penggalian kebutuhan, pemberian pilihan ke customer, atau proaktif menawarkan next step. Tujuannya melatih admin membaca konteks, bukan menghafal pola jawaban "yang paling sopan selalu benar"
* Pilihan yang diambil menentukan node chat berikutnya (percabangan), bukan alur linear
* Posisi tampil tiap pilihan diacak setiap kali muncul, supaya admin tidak bisa hafal pola posisi jawaban benar
* Tiap node punya kemungkinan berakhir di salah satu dari: lanjut ke node berikutnya, menuju penawaran Free Trial (`trial`), atau gagal (`fail_soft` untuk customer yang bilang mau pikir pikir dulu, `fail_hard` untuk customer yang pergi/kesal)

### Empat karakter customer dan karakteristiknya

| Customer | Karakteristik | Concern utama | Availability jadwal |
|---|---|---|---|
| Ibu Sarah | Netral | Kesesuaian program untuk anak kelas 4 SD yang baru mulai coding | Sesi 1 atau Sesi 2 |
| Pak Doni | Galak, threshold tinggi | Trauma kecewa dengan tempat les sebelumnya, skeptis soal harga dan janji | Sesi 2 atau Sesi 3 |
| Kak Rani | Santai, threshold rendah | Minim keraguan, datang dari rekomendasi teman | Semua sesi (paling fleksibel) |
| Bu Wati | Netral, concern berbeda | Anaknya pendiam/kurang percaya diri, khawatir soal kecocokan karakter anak, bukan soal harga | Hanya Sesi 2 |

Commitment level (`high` atau `low`) dihitung dari rata rata skor pilihan admin sepanjang percakapan sebelum masuk ke tahap penawaran trial, dengan ambang rata rata 3.6. Commitment level ini disimpan untuk dipakai di Episode 3 (hari H pelaksanaan trial), karena customer yang "daftar tapi ragu ragu" punya kemungkinan tidak datang di hari H.

## 5. Sistem Multi Chat dan Kesabaran (Patience)

Karena keempat customer chat bersamaan, ada mekanisme prioritas:

* Setiap customer punya nilai kesabaran awal (`patience`) yang berbeda sesuai karakter: Pak Doni (2, paling tidak sabar), Ibu Sarah dan Bu Wati (3), Kak Rani (4, paling sabar)
* Setiap kali admin membalas satu chat, seluruh chat lain yang sedang menunggu balasan kehilangan 1 poin kesabaran
* Kalau kesabaran sebuah chat mencapai 0, customer tersebut otomatis dianggap pergi (gagal), terlepas dari seberapa bagus jawaban yang sebenarnya akan diberikan admin
* Kesabaran direset ke nilai awal setiap kali ada pesan baru dari customer tersebut yang butuh dibalas
* Indikator visual di tab chat berupa titik warna: hijau (aman), kuning (mulai lama), merah (kritis, hampir pergi), tanpa menunjukkan angka pasti, supaya admin tetap harus membaca situasi bukan menghitung angka

## 6. Sistem Penjadwalan Trial

Setelah sebuah chat mengarah ke keputusan "mau coba Free Trial", admin harus menawarkan slot jadwal kepada customer tersebut, dengan constraint sebagai berikut:

**Slot yang tersedia:**
* Sesi 1, Senin jam 16.00, kapasitas 1
* Sesi 2, Rabu jam 16.00, kapasitas 1
* Sesi 3, Sabtu jam 10.00, kapasitas 2

Total kapasitas pas 4 slot untuk 4 customer, tapi availability tiap customer berbeda (lihat tabel di bagian 4). Bu Wati hanya bisa Sesi 2, sementara Kak Rani bisa semua sesi. Kalau admin salah menawarkan Sesi 2 ke customer yang sebetulnya lebih fleksibel (misalnya Kak Rani atau Ibu Sarah) padahal Sesi 1 atau Sesi 3 masih tersedia untuk mereka, maka Bu Wati bisa kehabisan satu satunya slot yang bisa dia ambil.

**Aturan penawaran slot:**
* Kalau slot yang ditawarkan sudah penuh, penawaran gagal dan admin bisa coba slot lain
* Kalau slot yang ditawarkan tidak ada di availability customer tersebut, penawaran juga gagal
* Sistem otomatis mengecek, setelah tiap percobaan gagal, apakah masih ada slot yang cocok dengan availability customer itu. Kalau semua slot yang cocok untuknya sudah penuh, chat tersebut otomatis berakhir dengan status "gagal jadwal", meskipun secara commitment chat sebelumnya sudah bagus

Hasil akhir tiap customer yang tersimpan mencakup status terdaftar atau tidak, commitment level, dan slot yang didapat (kalau berhasil).

## 7. Struktur Data (untuk referensi development lanjutan)

Disimpan di `window.gameState`, dengan struktur kurang lebih:

```
gameState = {
  episode1: {
    report: [ { area, item, reason }, ... ]
  },
  episode2: {
    slots: {
      s1: { label, cap, used },
      s2: { label, cap, used },
      s3: { label, cap, used }
    },
    customers: {
      sarah: { registered, commitment, slot } atau { registered: false, reason },
      doni: { ... },
      rani: { ... },
      wati: { ... }
    }
  }
}
```

Field `reason` untuk customer yang gagal terdaftar punya empat kemungkinan nilai: `mikir_dulu` (bilang mau pikir pikir dulu), `pergi` (kesal dan pergi karena jawaban buruk), `ditinggal_lama` (kehabisan kesabaran karena tidak dibalas), atau `gagal_jadwal` (sebenarnya mau daftar tapi kehabisan slot yang cocok).

Struktur ini sengaja dibuat agar gampang dibaca oleh Episode 3 (hari H trial) nantinya, terutama field `commitment` yang akan menentukan kemungkinan customer benar benar datang di hari trial atau tidak.

## 8. Keterbatasan Saat Ini dan Rencana Lanjutan

* Episode 1 masih menggunakan navigasi klik lokasi otomatis, belum karakter yang bisa digerakkan bebas dengan keyboard. Ini yang akan dipindah ke Phaser 3 dengan tilemap top down
* Asset visual masih placeholder kotak warna, belum pixel art asli
* Episode 3 (hari H pelaksanaan trial) belum didesain maupun dibangun, statusnya baru sebatas disepakati akan ada dan akan membaca `commitment_level` dari Episode 2
* Belum ada persistence data lintas sesi (refresh browser akan mengulang dari awal), karena masih tahap prototype
* Belum ada scoring/rating keseluruhan pemain di akhir permainan, baru sebatas rekap per episode

## 9. File Terkait

* `timedoor-admin-game.html`, file prototype yang berjalan penuh untuk Episode 1 dan Episode 2, bisa langsung dibuka di browser tanpa instalasi apa pun
