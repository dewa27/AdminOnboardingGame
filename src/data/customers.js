// Customer dialogue trees for Episode 2.
//
// Each customer has:
//   - name: display label
//   - availability: which slots they can take
//   - availLine: line spoken when transitioning into the trial scheduling UI
//   - start: id of the first node in the conversation
//   - nodes: map of nodeId -> { text, options: [{ text, score, next }] }
//
// `next` is either another nodeId, 'trial' (success path), 'fail_soft' (customer
// says "I'll think about it") or 'fail_hard' (customer leaves annoyed).
//
// Scoring: each option carries a score 1..4. The mean score across all picks
// before the trial node determines the customer's commitment level (>= 3.6 =
// 'high', else 'low'). Episode 3 will read that to decide if the customer
// actually shows up on trial day.
//
// These trees are a faithful port of the original prototype in
// timedoor-admin-game.html.
export const customers = {
  sarah: {
    name: 'Ibu Sarah',
    availability: ['s1', 's2'],
    availLine: 'anaknya sekolah full day, jadi maunya sore hari pas weekday atau weekend santai',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Halo min, mau tanya untuk anak saya kelas 4 SD ada program coding gak ya?',
        options: [
          { text: 'Halo Bu Sarah, ada kak. Untuk kelas 4 SD kami punya program coding dasar. Kalau boleh tau, anaknya sebelumnya udah pernah coba coding atau baru mau mulai ya Bu?', score: 4, next: 'n2a' },
          { text: 'Halo Bu Sarah! Ada kak, untuk anak kelas 4 SD kami punya program coding dasar yang disesuaikan usia. Boleh saya bantu jelaskan detailnya?', score: 3, next: 'n2b' },
          { text: 'Ada beberapa program, tergantung kebutuhan. Mau yang seperti apa Bu?', score: 2, next: 'n2c' },
          { text: 'Untuk usia segitu bisa ikut kelas coding umum aja Bu, sama aja.', score: 1, next: 'n2d' }
        ]
      },
      n2a: {
        text: 'Wah oke, dia baru mau mulai sih min, belum pernah coding sama sekali. Kira kira biayanya berapa ya? Terus jadwalnya fleksibel gak, soalnya anak saya sekolah full day.',
        options: [
          { text: 'Untuk pemula ada paket dasar mulai harga terjangkau, dan jadwalnya bisa sore hari atau weekend. Kalau Ibu mau, kita coba Free Trial dulu gratis biar tau cocok atau enggak sebelum daftar penuh?', score: 4, next: 'trial' },
          { text: 'Untuk pemula ada paket dasar dengan harga terjangkau kok Bu.', score: 3, next: 'n2c' },
          { text: 'Untuk biaya nanti dijelasin CS lain ya Bu.', score: 1, next: 'fail_soft' }
        ]
      },
      n2b: {
        text: 'Ooh oke. Emang bedanya sama kelas coding yang lain apa ya min?',
        options: [
          { text: 'Bedanya di kurikulum project based, jadi anak langsung bikin karya nyata, didampingi mentor tetap. Kalau Ibu penasaran, bisa coba Free Trial dulu buat ngerasain langsung.', score: 4, next: 'trial' },
          { text: 'Kurikulumnya lebih terstruktur sih Bu dibanding tempat lain.', score: 3, next: 'n2c' },
          { text: 'Sama aja sih Bu, cuma beda nama.', score: 2, next: 'fail_soft' },
          { text: 'Ohiya Bu, kebetulan lagi ada promo diskon loh!', score: 1, next: 'fail_hard' }
        ]
      },
      n2c: {
        text: 'Hmm gimana ya, saya kurang paham programnya kayak apa.',
        options: [
          { text: 'Wajar Bu bingung, saya bantu jelasin ya: anak belajar logika dasar dulu lewat game, baru masuk ke bikin project sederhana. Progressnya keliatan tiap minggu. Mau coba Free Trial dulu Bu?', score: 4, next: 'trial' },
          { text: 'Jadi anak belajar coding dari dasar Bu, step by step.', score: 2, next: 'fail_soft' },
          { text: 'Coba dibaca di website aja Bu, lengkap kok infonya.', score: 1, next: 'fail_hard' }
        ]
      },
      n2d: {
        text: 'Yaudah deh, saya pikir pikir dulu ya.',
        options: [
          { text: 'Bu, sebelum mikir panjang, gimana kalau coba Free Trial gratis dulu aja? Gak perlu komit apa apa, biar Ibu bisa liat langsung cocok atau enggak buat anak.', score: 4, next: 'trial' },
          { text: 'Baik Bu, ditunggu ya.', score: 2, next: 'fail_soft' },
          { text: 'Bu, promo cuma sampai minggu ini loh, sayang kalau kelewat!', score: 1, next: 'fail_hard' }
        ]
      }
    }
  },

  doni: {
    name: 'Pak Doni',
    availability: ['s2', 's3'],
    availLine: 'sibuk kerja, cuma bisa tengah minggu atau weekend pagi',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Halo, mau tanya program coding di sini. Tapi denger denger mahal ya? Anak saya udah pernah les di tempat lain, kecewa, gak sesuai omongan sales.',
        options: [
          { text: 'Halo Pak Doni, terima kasih infonya. Saya paham kekhawatiran Bapak setelah pengalaman kurang baik sebelumnya. Boleh saya tau dulu apa yang bikin kecewa waktu itu, biar saya bisa kasih info yang relevan aja buat Bapak?', score: 4, next: 'n2a' },
          { text: 'Halo Pak Doni, mohon maaf atas pengalaman sebelumnya. Program kami beda kok Pak, kurikulumnya jelas dan hasil belajarnya terukur.', score: 3, next: 'n2b' },
          { text: 'Halo Pak, untuk harga bisa dicek di website ya, programnya bagus kok.', score: 2, next: 'fail_soft' },
          { text: 'Semua tempat les emang gitu Pak, tergantung anaknya juga sih.', score: 1, next: 'fail_hard' }
        ]
      },
      n2a: {
        text: 'Dulu itu katanya ada laporan progress tiap bulan, tapi gak pernah dikasih. Sales-nya juga susah dihubungi pas ada masalah.',
        options: [
          { text: 'Noted Pak, itu concern yang valid. Di kami ada laporan progress rutin dan Bapak bisa langsung chat admin kapan aja kalau ada kendala, responnya di jam kerja. Kalau Bapak mau, saya bisa tunjukin contoh laporan progressnya?', score: 4, next: 'n3a' },
          { text: 'Di kami ada laporan progress rutin kok Pak, dan admin selalu responsif.', score: 3, next: 'n3a' },
          { text: 'Iya Pak macem macem sih tergantung tempatnya.', score: 2, next: 'fail_soft' },
          { text: 'Kalau gitu nanti dicoba aja dulu Pak, biar tau bedanya.', score: 1, next: 'fail_hard' }
        ]
      },
      n2b: {
        text: 'Ya udah, tapi saya masih ragu. Coba jelasin lagi kenapa saya harus percaya program ini beda?',
        options: [
          { text: 'Saya ngerti Pak masih ragu, itu wajar. Bedanya kami kasih laporan progress rutin per bulan dan Bapak bisa pantau langsung, gak cuma janji di depan doang. Boleh saya tunjukin contohnya?', score: 4, next: 'n3a' },
          { text: 'Kami serius kok Pak sama kualitas, gak akan mengecewakan.', score: 2, next: 'fail_soft' },
          { text: 'Ya kalau gak percaya juga gapapa Pak, monggo.', score: 1, next: 'fail_hard' }
        ]
      },
      n3a: {
        text: 'Oke, boleh juga kalau gitu. Tapi soal harga gimana, ada yang lebih murah gak, secara saya udah kapok keluar duit percuma.',
        options: [
          { text: 'Saya paham Pak. Daripada langsung komit, gimana kalau coba Free Trial dulu gratis, biar Bapak sama anak bisa ngerasain dulu sebelum mutusin lanjut atau enggak?', score: 4, next: 'trial' },
          { text: 'Untuk harga ada paket dan diskon tertentu kok Pak, saya jelasin ya.', score: 2, next: 'fail_soft' },
          { text: 'Ini udah harga terbaik kok Pak, gak bisa kurang lagi.', score: 1, next: 'fail_hard' }
        ]
      }
    }
  },

  rani: {
    name: 'Kak Rani',
    availability: ['s1', 's2', 's3'],
    availLine: 'kapan aja bisa, fleksibel banget',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Halo kak, aku mau daftarin adekku les coding. Temenku anaknya udah les di sini katanya bagus. Gimana caranya ya?',
        options: [
          { text: 'Halo kak Rani! Seneng dengernya, temannya udah ngerasain manfaatnya ya. Untuk daftar, aku bisa langsung bantu kirimin link form-nya sekarang, atau kalau mau ada juga opsi coba Free Trial dulu bareng adeknya. Kak Rani lebih nyaman yang mana?', score: 4, next: 'n2' },
          { text: 'Halo kak, makasih infonya! Untuk daftar bisa langsung isi form di link ini ya, nanti tim kami hubungi lagi.', score: 3, next: 'n2' },
          { text: 'Oh gitu, kalau mau daftar tinggal transfer aja terus kirim buktinya.', score: 2, next: 'fail_soft' },
          { text: 'Baik kak, jadi program kami itu ada banyak tingkatan mulai dari dasar sampai lanjutan, dengan kurikulum project based yang disesuaikan usia, dan juga ada sertifikat di tiap levelnya, mentornya juga berpengalaman semua...', score: 1, next: 'fail_soft' }
        ]
      },
      n2: {
        text: 'Oh oke! Adekku kelas 5 SD. Terus biayanya berapa kak, terus bisa mulai kapan?',
        options: [
          { text: 'Untuk kelas 5 SD ada paket coding dasar, biayanya segini ya kak. Kalau mau, kita bisa mulai dari Free Trial gratis minggu ini dulu.', score: 4, next: 'trial' },
          { text: 'Untuk kelas 5 SD biayanya segini kak, jadwalnya bisa diatur nanti.', score: 3, next: 'trial' },
          { text: 'Hmm soal biaya itu tergantung banyak faktor sih kak, nanti dihitungin lagi ya.', score: 1, next: 'fail_soft' }
        ]
      }
    }
  },

  wati: {
    name: 'Bu Wati',
    availability: ['s2'],
    availLine: 'anaknya cuma kosong hari itu aja, hari lain udah ada les/kegiatan lain',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Halo min, saya mau tanya. Anak saya agak pendiam, kurang PD kalau ketemu orang baru. Kira kira cocok gak ya ikut kelas coding di sini? Saya takut dia malah tambah minder kalau gak bisa ikutin temen temennya.',
        options: [
          { text: 'Halo Bu Wati, terima kasih sudah cerita ya. Banyak juga kok anak yang awalnya pendiam ikut kelas kami, karena belajarnya project based jadi fokusnya ke hasil karya sendiri dulu, bukan kompetisi ngomong di depan kelas. Mentornya juga terbiasa dampingi anak yang butuh waktu buat nyaman. Boleh tau anaknya kelas berapa Bu?', score: 4, next: 'n2a' },
          { text: 'Halo Bu, tenang aja, kelas kami suportif kok buat semua tipe anak, gak akan ada tekanan buat anak yang pendiam.', score: 3, next: 'n2b' },
          { text: 'Setiap anak beda beda Bu, coba aja dulu nanti keliatan cocok atau enggak.', score: 2, next: 'n2b' },
          { text: 'Oh kalau anaknya pendiam mending ikutan kelas lain aja yang lebih santai, coding kan butuh aktif diskusi.', score: 1, next: 'fail_hard' }
        ]
      },
      n2a: {
        text: 'Oh gitu ya, lumayan lega dengernya. Anaknya kelas 3 SD. Terus kalau misalnya dia diem aja gak mau nyoba gimana min, apa dipaksa?',
        options: [
          { text: 'Enggak akan dipaksa Bu, mentor kami biasanya kasih waktu anak observasi dulu sebelum diajak ikut aktif, jadi dia yang nentuin ritmenya sendiri. Kalau Ibu mau, boleh juga temenin sesi pertama sebagai Free Trial biar sama sama liat responnya.', score: 4, next: 'trial' },
          { text: 'Enggak dipaksa Bu, mentornya udah biasa handle macem macem karakter anak.', score: 3, next: 'n2c' },
          { text: 'Nanti kita liat aja Bu progressnya gimana.', score: 2, next: 'n2c' },
          { text: 'Ya kalau gak mau nyoba berarti emang belum siap Bu.', score: 1, next: 'fail_hard' }
        ]
      },
      n2b: {
        text: 'Hmm oke deh. Tapi saya masih agak ragu sih, takut nanti nyesel udah bayar tapi anaknya gak nyaman.',
        options: [
          { text: 'Wajar kok Bu khawatir gitu. Makanya biar gak perlu langsung komit, ada opsi coba Free Trial dulu gratis, jadi Ibu bisa liat langsung responnya anak sebelum mutusin lanjut atau enggak.', score: 4, next: 'trial' },
          { text: 'Kalau ragu emang wajar Bu, banyak juga yang awalnya ragu tapi akhirnya lanjut kok.', score: 2, next: 'fail_soft' },
          { text: 'Kalau ragu, mendingan dipikir pikir dulu aja Bu di rumah.', score: 1, next: 'fail_soft' }
        ]
      },
      n2c: {
        text: 'Hmm oke, tapi saya masih agak ragu sih, takut nanti nyesel udah bayar tapi anaknya gak nyaman.',
        options: [
          { text: 'Wajar kok Bu khawatir gitu. Makanya biar gak perlu langsung komit, ada opsi coba Free Trial dulu gratis, jadi Ibu bisa liat langsung responnya anak sebelum mutusin lanjut atau enggak.', score: 4, next: 'trial' },
          { text: 'Kalau ragu emang wajar Bu, banyak juga yang awalnya ragu tapi akhirnya lanjut kok.', score: 2, next: 'fail_soft' },
          { text: 'Kalau ragu, mendingan dipikir pikir dulu aja Bu di rumah.', score: 1, next: 'fail_soft' }
        ]
      }
    }
  }
};

// Display order for tabs.
export const customerOrder = ['sarah', 'doni', 'rani', 'wati'];

// Initial patience per customer. Pak Doni is the most impatient, Kak Rani the
// most patient — these numbers drive the "they left" mechanic.
export const patienceBase = { sarah: 3, doni: 2, rani: 4, wati: 3 };