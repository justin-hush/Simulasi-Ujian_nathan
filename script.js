// ==========================================
// CONFIGURASI & STATE GLOBAL
// ==========================================
const totalQuestions = 5; // Jumlah soal yang diminta ke AI
let correctAnswers = []; // Menyimpan kunci jawaban asli dari AI

// ==========================================
// SELEKTOR ELEMEN HTML (DOM)
// ==========================================
const setupScreen = document.getElementById('setup-screen');
const loadingScreen = document.getElementById('loading-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quizForm = document.getElementById('quiz-form');
const questionsContainer = document.getElementById('questions-container');

// Input Form
const apiKeyInput = document.getElementById('api-key');
const studentNameInput = document.getElementById('student-name');
const gradeSelect = document.getElementById('grade');
const classSelect = document.getElementById('class-select'); 
const subjectSelect = document.getElementById('subject');
const semesterSelect = document.getElementById('semester');

// Result Form Elements
const resName = document.getElementById('res-name');
const resMeta = document.getElementById('res-meta');
const resScore = document.getElementById('res-score');
const resMessage = document.getElementById('res-message');

// ==========================================
// LOGIKA PILIHAN KELAS DINAMIS
// ==========================================
function updateClassOptions() {
    const selectedGrade = gradeSelect.value;
    classSelect.innerHTML = ''; // Kosongkan opsi sebelumnya

    let classes = [];
    if (selectedGrade === 'SD') {
        classes = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];
    } else if (selectedGrade === 'SMP') {
        classes = ['Kelas 7', 'Kelas 8', 'Kelas 9'];
    } else if (selectedGrade === 'SMA') {
        classes = ['Kelas 10', 'Kelas 11', 'Kelas 12'];
    }

    // Masukkan opsi baru ke dalam dropdown HTML
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        classSelect.appendChild(option);
    });
}

// Jalankan fungsi pengisian kelas saat pertama kali web dibuka
updateClassOptions();

// Jalankan fungsi pengisian kelas setiap kali dropdown "Jenjang" diubah oleh user
gradeSelect.addEventListener('change', updateClassOptions);


// ==========================================
// EVENT LISTENERS UTAMA
// ==========================================

// 1. Aksi Tombol "Mulai Ujian"
startBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const name = studentNameInput.value.trim();
    const grade = gradeSelect.value;
    const selectedClass = classSelect.value;
    const subject = subjectSelect.value;
    const semester = semesterSelect.value;

    if (!apiKey || !name) {
        alert('Harap isi API Key Gemini dan Nama Anda terlebih dahulu!');
        return;
    }

    // Navigasi ke layar loading
    setupScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');

    try {
        const questions = await fetchQuestionsFromGemini(apiKey, grade, selectedClass, subject, semester);
        renderQuestions(questions, name, grade, selectedClass, subject, semester);
    } catch (error) {
        alert('Gagal membuat soal dari Gemini AI. Periksa kembali API Key Anda, koneksi internet, atau coba ganti beberapa saat lagi.\n\nDetail error: ' + error.message);
        loadingScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    }
});

// 2. Aksi Pengiriman Form Ujian (Kirim Jawaban)
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let scoreCount = 0;
    const formData = new FormData(quizForm);

    correctAnswers.forEach(item => {
        const userAnswer = formData.get(`question-${item.id}`);
        if (userAnswer === item.kunci) {
            scoreCount++;
        }
    });

    // Menghitung nilai akhir dengan skala 100
    const finalScore = Math.round((scoreCount / totalQuestions) * 100);

    // Memasukkan data ke layar hasil
    resName.innerText = studentNameInput.value;
    resMeta.innerText = `${gradeSelect.value} (${classSelect.value}) - ${subjectSelect.value} (Semester ${semesterSelect.value})`;
    resScore.innerText = finalScore;

    // Menentukan pesan umpan balik berdasarkan skor
    if (finalScore >= 85) {
        resMessage.innerText = "Luar biasa, nilai yang sempurna! Pertahankan kemampuan belajarmu.";
    } else if (finalScore >= 70) {
        resMessage.innerText = "Bagus sekali! Kamu sudah memahami materi dengan baik.";
    } else if (finalScore >= 50) {
        resMessage.innerText = "Cukup baik, mari tingkatkan lagi belajarmu pada topik ini.";
    } else {
        resMessage.innerText = "Jangan berkecil hati. Ayo tinjau kembali materi pelajaran dan coba lagi!";
    }

    // Navigasi ke layar hasil
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
});

// 1. Aksi Tombol "Mulai Ujian" (DIOPTIMALKAN)
startBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const name = studentNameInput.value.trim();
    const grade = gradeSelect.value;
    const selectedClass = classSelect.value;
    const subject = subjectSelect.value;
    const semester = semesterSelect.value;

    if (!apiKey || !name) {
        alert('Harap isi API Key Gemini dan Nama Anda terlebih dahulu!');
        return;
    }

    // KUNCI TOMBOL agar tidak bisa diklik berkali-kali saat proses berjalan
    startBtn.disabled = true;
    startBtn.innerText = "Sedang Memproses...";

    // Navigasi ke layar loading
    setupScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');

    try {
        const questions = await fetchQuestionsFromGemini(apiKey, grade, selectedClass, subject, semester);
        renderQuestions(questions, name, grade, selectedClass, subject, semester);
    } catch (error) {
        // Tampilkan detail error yang lebih spesifik untuk pelacakan
        alert('Terjadi Masalah!\n\nDetail error: ' + error.message);
        loadingScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    } finally {
        // Buka kembali kunci tombol setelah selesai/gagal
        startBtn.disabled = false;
        startBtn.innerText = "Mulai Ujian";
    }
});

// ==========================================
// ==========================================
// Fungsi memanggil API Gemini (VERSI ANTI-ERROR 429 & AUTO-RETRY)
async function fetchQuestionsFromGemini(apiKey, grade, selectedClass, subject, semester) {
    const loadingText = document.querySelector('#loading-screen p') || document.createElement('p');

    const prompt = `Buatkan ${totalQuestions} soal pilihan ganda untuk ujian tingkat ${grade} tingkat ${selectedClass}, mata pelajaran ${subject}, semester ${semester}. 
    Materi soal harus disesuaikan secara akurat dan valid dengan kurikulum pendidikan nasional Indonesia untuk ${selectedClass}.
    Setiap soal harus memiliki 4 pilihan (A, B, C, D). 
    Berikan respons Anda HANYA dalam bentuk JSON array objek yang valid dengan format tepat seperti ini:
    [
      {
        "id": 1,
        "soal": "Pertanyaan soal disini?",
        "opsi": {"A": "Pilihan A", "B": "Pilihan B", "C": "Pilihan C", "D": "Pilihan D"},
        "kunci": "A"
      }
    ]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    let response;
    let maxRetries = 3;       // Jatah mencoba ulang jika error
    let delayTime = 6000;     // Jeda awal 6 detik jika terkena limit

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        loadingText.innerText = `Sedang menyusun 30 soal... (Proses berjalan, mohon tunggu)`;
        
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        maxOutputTokens: 8000 // Menjamin teks 30 soal tidak terpotong
                    }
                })
            });

            // Jika sukses (HTTP 200), keluar dari perulangan retry
            if (response.ok) break;

            // Jika terkena Error 429 (Too Many Requests)
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    loadingText.innerText = `API Google penuh. Menunggu ${delayTime / 1000} detik sebelum mencoba kembali otomatis...`;
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                    delayTime *= 2; // Naikkan jeda waktu menjadi 12 detik di percobaan berikutnya
                    continue;
                }
                throw new Error("Google AI Studio mendeteksi terlalu banyak permintaan. Tunggu 1 menit lalu coba lagi.");
            }

            // Jika error HTTP lainnya (misal 400 karena API Key salah)
            throw new Error(`HTTP Status: ${response.status}. Periksa kembali validitas API Key Anda.`);

        } catch (fetchError) {
            // Jika sudah percobaan terakhir dan tetap gagal, lempar error ke luar
            if (attempt === maxRetries) throw fetchError;
        }
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Gemini tidak memberikan respons. Pastikan kuota API Key gratis Anda belum habis.");
    }

    let rawText = data.candidates[0].content.parts[0].text.trim();
    
    try {
        const allQuestions = JSON.parse(rawText);
        
        if (!Array.isArray(allQuestions)) {
            throw new Error("Format AI bukan Array.");
        }

        // Urutkan ulang ID dari 1 sampai 30
        allQuestions.forEach((q, index) => {
            q.id = index + 1;
        });

        loadingText.innerText = "Memuat kuis...";
        return allQuestions;
        
    } catch (parseError) {
        throw new Error("Gagal membaca struktur soal. Silakan klik tombol 'Mulai Ujian' sekali lagi untuk membuat ulang.");
    }
}