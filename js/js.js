/* ================= CONFIGURATION ================= */
const FILTERS = {
    normal: 'contrast(1.05) brightness(1.02) saturate(1.1)',
    bw: 'grayscale(1) contrast(1.4) brightness(0.95)',
    vintage: 'sepia(0.5) contrast(0.9) brightness(1.05) hue-rotate(-10deg)',
    soft: 'brightness(1.15) saturate(1.1) contrast(0.9) blur(0.4px)',
    country: 'sepia(0.3) saturate(1.4) contrast(1.05) brightness(0.95)',
    dv: 'contrast(1.5) saturate(0.4) brightness(1.1) hue-rotate(20deg)',
    instax: 'contrast(1.25) saturate(1.6) brightness(1.05) hue-rotate(5deg)',
    nordic: 'saturate(0.6) contrast(1.1) brightness(1.05) hue-rotate(15deg) sepia(0.1)',
    midnight: 'contrast(1.2) brightness(0.9) saturate(0.8) hue-rotate(180deg) brightness(1.1)',
    cyber: 'contrast(1.3) saturate(2.5) hue-rotate(-40deg) brightness(1.1)',
    faded: 'contrast(0.8) brightness(1.15) saturate(0.8) sepia(0.2)',
    candy: 'saturate(2) contrast(1.1) brightness(1.05) hue-rotate(-5deg)',
    noir: 'grayscale(1) contrast(2) brightness(0.7)',
    golden: 'sepia(0.45) saturate(1.7) contrast(1) brightness(1.1) hue-rotate(-20deg)',
    ocean: 'hue-rotate(160deg) saturate(0.8) contrast(1.1) brightness(1.05)',
    retro: 'sepia(0.2) contrast(1.3) brightness(1) saturate(1.5) hue-rotate(-10deg)',
    bloom: 'brightness(1.2) saturate(1.2) contrast(0.9) blur(0.6px)',
    glitch: 'contrast(1.5) saturate(2) hue-rotate(90deg) opacity(0.8)'
};

const USER_SETTINGS = {
    timer: null,
    count: null,
    filter: 'normal',
    frameColor: '#ffffff',
    storeColor: '#000000',
    useStoreColor: false,
    bgImage: null,
    textPrimaryEditor: '',
    textSecondary: '',
    emoji: '',
    dateModeEditor: 'auto',
    customDate: '',
    frameID: 'null',
    useTemplate: true
};

const TEXTURE_PATH = 'texture/'
const FRAME_PATH = 'frame/'
const TEXTURES = [
    '1.png',
    '2.png',
    '3.png',
    '4.png',
    '5.png',
    '6.png',
    '7.png',
];

const EMOJI_LIST = ['❤️', '✨', '⭐', '👑', '🎀', '🍀', '🔥', '🌈', '😎', '📸', '🥳', '🌸', '🦄', '🐾', '🦋', '💎', '☁️', '🧸'];
const appFlow = ['startScreen', 'tutorialScreen', 'setupScreen', 'boothScreen', 'resultScreen'];
let currentFlowIndex = 0;
/* ================= STATE ================= */
let shots = [];
let maxShots = 2;
let currentShot = 0;
let replaceIndex = null;
let isCounting = false;
let activeFilter = 'normal';
let currentStep = 1;
let isMirrored = true;
let activeStickers = [];
let selectedStickerIndex = null;
let isDraggingSticker = false;
let needsUpdate = false;
let currentDeviceId = null;
let dragOffsetX = 0, dragOffsetY = 0;


function initTextureGallery() {
    const gallery = document.getElementById('textureGallery');
    const removeUploadBtn = document.getElementById('removeUploadBtn');
    const removeTextureBtn = document.getElementById('removeTextureBtn');
    if (!gallery) return;

    gallery.innerHTML = '';
    TEXTURES.forEach(file => {
        const div = document.createElement('div');
        div.className = 'texture-item';
        const fullPath = TEXTURE_PATH + file;
        div.style.backgroundImage = `url('${fullPath}')`;

        if (USER_SETTINGS.bgImage === fullPath) div.classList.add('active');

        div.onclick = () => {
            USER_SETTINGS.bgImage = fullPath;

            document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            if (removeTextureBtn) removeTextureBtn.style.display = 'block';
            if (removeUploadBtn) removeUploadBtn.style.display = 'none';

            const uploadInput = document.getElementById('bgUploadEditor');
            if (uploadInput) uploadInput.value = '';

            makeCollage();
        };
        gallery.appendChild(div);
    });
}

function initFrameGallery() {
    const gallery = document.getElementById('frameTemplateGallery');
    const removeFrameBtn = document.getElementById('removeFrameBtn');
    if (!gallery) return;

    gallery.innerHTML = '';
    const frames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    frames.forEach(id => {
        const item = document.createElement('div');
        item.className = 'texture-item';

        const fullPath = `${FRAME_PATH}${maxShots}/${id}.png`;

        item.style.backgroundImage = `url('${fullPath}')`;
        item.style.backgroundSize = 'contain';
        item.style.backgroundRepeat = 'no-repeat';
        item.style.backgroundPosition = 'center';
        item.style.borderRadius = '4px';

        if (USER_SETTINGS.frameID === id) {
            item.classList.add('active');
            if (removeFrameBtn) removeFrameBtn.style.display = 'block';
        }

        item.onclick = () => {
            USER_SETTINGS.frameID = id;

            document.querySelectorAll('#frameTemplateGallery .texture-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            if (removeFrameBtn) removeFrameBtn.style.display = 'block';

            makeCollage();
        };

        gallery.appendChild(item);
    });
}

function removeFrameTemplate() {
    USER_SETTINGS.frameID = null;
    document.querySelectorAll('#frameTemplateGallery .texture-item').forEach(el => el.classList.remove('active'));

    const removeFrameBtn = document.getElementById('removeFrameBtn');
    if (removeFrameBtn) removeFrameBtn.style.display = 'none';

    makeCollage();
}

function showScreen(screenId) {
    // 1. Sembunyikan semua screen
    document.querySelectorAll('.screen').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = (screenId === 'boothScreen') ? 'grid' : 'flex';
        setTimeout(() => target.classList.add('active'), 50);

        currentFlowIndex = appFlow.indexOf(screenId);

        // 2. LOGIKA NAVBAR SIMPEL (Hanya 3 Layar)
        const globalNav = document.getElementById('mainNavigation');
        if (globalNav) {
            const layarAktifNavbar = ['tutorialScreen', 'setupScreen', 'boothScreen'];

            if (layarAktifNavbar.includes(screenId)) {
                globalNav.style.display = 'flex';
            } else {
                globalNav.style.display = 'none';
            }
        }

        if (screenId === 'boothScreen') startVideo();
    }
}
function updateGlobalNextStatus() {
    const nextBtn = document.getElementById('globalNext');
    if (!nextBtn) return;

    const currentScreen = appFlow[currentFlowIndex];

    if (currentScreen === 'boothScreen') {
        // Di booth, tombol NEXT hanya aktif jika foto sudah penuh (shots tidak null)
        const filledShots = shots.filter(s => s !== null).length;
        nextBtn.disabled = (filledShots !== maxShots);

        // Tambahkan efek visual jika sudah penuh
        if (filledShots === maxShots) {
            nextBtn.classList.add('pulse-animation');
        } else {
            nextBtn.classList.remove('pulse-animation');
        }
    } else {
        // Di screen lain (Tutorial/Setup), tombol NEXT selalu aktif
        nextBtn.disabled = false;
        nextBtn.classList.remove('pulse-animation');
    } const originalUpdatePreview = updatePreview;
    updatePreview = function () {
        originalUpdatePreview(); // Jalankan fungsi lama
        updateGlobalNextStatus(); // Sinkronkan ke tombol global
    };

}

// 3. Fungsi Navigasi Maju (Global Next)
function goNext() {
    const currentScreen = appFlow[currentFlowIndex];

    if (currentScreen === 'setupScreen') {
        if (selectedSettings.timer === null || selectedSettings.count === null) {
            alert("Mohon pilih durasi foto dan jumlah foto terlebih dahulu!");
            return;
        }
        confirmSetup();

    } else if (currentScreen === 'boothScreen') {
        const filledShots = shots.filter(s => s !== null).length;
        const maxShots = selectedSettings.count;

        if (filledShots === maxShots) {
            const userSetuju = confirm("Apakah Anda sudah puas dengan hasil foto? Klik OK untuk memproses kolase.");
            if (userSetuju) {
                makeCollage();
            }
        } else {
            alert("Silahkan ambil semua foto terlebih dahulu!");
        }
    } else {
        currentFlowIndex++;
        showScreen(appFlow[currentFlowIndex]);
    }
}
// 4. Fungsi Navigasi Mundur (Global Prev)
function goBack() {
    if (currentFlowIndex > 0) {
        // Jika mundur dari booth ke setup, tawarkan reset foto
        if (appFlow[currentFlowIndex] === 'boothScreen') {
            if (!confirm("Kembali ke setup akan menghapus foto yang sudah diambil. Lanjutkan?")) return;
            shots = [];
        }
        currentFlowIndex--;
        showScreen(appFlow[currentFlowIndex]);
    }
}

/* ================= DOM ELEMENTS ================= */
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const collage = document.getElementById('collage');
const flash = document.getElementById('flash');
const countdownEl = document.getElementById('countdown');
const previewStrip = document.getElementById('previewStrip');
const shutterBtn = document.getElementById('shutterBtn');
const boothScreen = document.getElementById('boothScreen');
const resultScreen = document.getElementById('resultScreen');
const mirrorBtn = document.getElementById('mirrorBtn');


const ctx = canvas.getContext('2d');
const cctx = collage.getContext('2d');

/* ================= CAMERA SETUP ================= */
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
        video.srcObject = stream;

        if (isMirrored) {
            video.classList.add('mirrored');
        } else {
            video.classList.remove('mirrored');
        }
    })
    .catch(err => alert("Kamera tidak diizinkan atau tidak ditemukan"));

// Fungsi untuk mendeteksi daftar kamera
async function initCameraList() {
    const select = document.getElementById('cameraSelect');
    if (!select) return;

    try {
        // Minta izin akses kamera sebentar untuk mendapatkan label/nama kamera
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        select.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            select.appendChild(option);
        });

        // Jika user ganti pilihan di dropdown
        select.onchange = async () => {
            currentDeviceId = select.value;
            if (document.getElementById('boothScreen').style.display !== 'none') {
                startVideo(); // Langsung ganti kamera jika sedang di booth
            }
        };

        if (videoDevices.length > 0) currentDeviceId = videoDevices[0].deviceId;

    } catch (err) {
        console.error("Gagal mendeteksi kamera:", err);
        select.innerHTML = '<option>Akses Kamera Ditolak</option>';
    }
}

async function startVideo() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
    }

    // Gunakan pengaturan yang lebih longgar agar OBS lebih mudah sinkron
    const constraints = {
        video: {
            deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.stream = stream;
        const videoElement = document.getElementById('video');
        videoElement.srcObject = stream;

        // Pastikan video tidak diam (freeze)
        videoElement.onloadedmetadata = () => {
            videoElement.play();
        };
    } catch (err) {
        console.error("Gagal memulai kamera:", err);
        // Fallback jika resolusi ideal gagal
        if (err.name === "OverconstrainedError") {
            const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
            document.getElementById('video').srcObject = basicStream;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCameraList();
    initTextureGallery();
    initFrameGallery();

    const nav = document.getElementById('mainNavigation');
    if (nav) nav.style.display = 'none';
});

/* ================= MULTI-STEP NAVIGATION ================= */
function goToStep(step) {
    const totalSteps = 3;

    document.querySelectorAll('.editor-step').forEach(el => el.classList.remove('active'));
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) targetStep.classList.add('active');

    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const finalActions = document.getElementById('finalActions');

    if (nextBtn) {
        nextBtn.disabled = false; // Pastikan tombol aktif kembali
        nextBtn.style.opacity = "1";
    }

    if (prevBtn) prevBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';

    if (step === totalSteps) {
        nextBtn.textContent = "Download & Finish";
        nextBtn.classList.add('download-mode');
        // Logika klik untuk download bisa ditaruh di sini atau di event listener terpisah
    } else {
        nextBtn.textContent = "Next";
        nextBtn.classList.remove('download-mode');
    }

    if (step === 2) {
        initFrameGallery();
    }

    if (finalActions) finalActions.style.display = 'none';

    currentStep = step;
}

let selectedSettings = {
    timer: null,
    count: null
};

function updateSelection(type, value, element) {
    selectedSettings[type] = parseInt(value);

    // Visual feedback
    const column = element.closest('.setup-column');
    column.querySelectorAll('.selection-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');

    // Aktifkan tombol NEXT global
    const nextBtn = document.getElementById('globalNext'); // Sesuaikan ID
    if (selectedSettings.timer !== null && selectedSettings.count !== null) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
    }
}
document.getElementById('nextStep').onclick = () => {
    if (currentStep < 3) {
        goToStep(currentStep + 1);
    } else {
        const pesan = "Apakah desain sudah sesuai? Foto akan didownload dan Anda akan kembali ke layar kamera.";

        if (confirm(pesan)) {
            const link = document.createElement('a');
            link.download = `photobooth-${Date.now()}.png`;
            link.href = collage.toDataURL('image/png');
            link.click();
        }
    }
};
document.getElementById('prevStep').onclick = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
};



function confirmSetup() {
    USER_SETTINGS.timer = selectedSettings.timer;
    USER_SETTINGS.count = selectedSettings.count;

    maxShots = USER_SETTINGS.count;
    shots = [];
    currentShot = 0;
    replaceIndex = null;

    showScreen('boothScreen');

    updatePreview();
}

function applyStyleSettings() {
    activeFilter = USER_SETTINGS.filter;
    video.style.filter = FILTERS[activeFilter];
}

function drawCoverImage(targetCtx, img, canvasW, canvasH) {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasW / canvasH;
    let sx, sy, sw, sh;

    if (imgRatio > canvasRatio) {
        sh = img.height;
        sw = img.height * canvasRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = img.width / canvasRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }
    targetCtx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
}

function getAverageColor(imgElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = imgElement.naturalWidth || imgElement.width;
    const height = canvas.height = imgElement.naturalHeight || imgElement.height;

    ctx.drawImage(imgElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;

    for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
    }

    const count = imageData.length / 4;
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* ================= CORE FUNCTIONS ================= */
function startCameraNow() {
    showScreen('boothScreen');
    console.log("Kamera diaktifkan, masuk ke pengaturan timer...");
    updatePreview();
}

function updatePreview() {
    previewStrip.innerHTML = '';
    for (let i = 0; i < maxShots; i++) {
        const box = document.createElement('div');
        box.className = 'preview-box';

        if (shots[i]) {
            const img = document.createElement('img');
            img.src = shots[i];
            img.onclick = () => {
                replaceIndex = i;
                alert(`Slot foto ${i + 1} terpilih. Foto berikutnya akan mengganti foto ini.`);
            };
            box.appendChild(img);

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm("Hapus foto ini dan ambil ulang?")) {
                    shots[i] = null;
                    if (replaceIndex === i) replaceIndex = null;
                    updatePreview();
                }
            };
            box.appendChild(delBtn);
        }
        previewStrip.appendChild(box);

        const filledShots = shots.filter(s => s !== null).length;
        const isFull = (filledShots === maxShots);

        // Update tombol NEXT global
        const globalNextBtn = document.getElementById('globalNext');
        if (globalNextBtn) {
            globalNextBtn.disabled = !isFull;
            // Tambahkan efek visual agar user tahu tombol sudah aktif
            if (isFull) {
                globalNextBtn.style.opacity = "1";
                globalNextBtn.classList.add('pulse-animation');
            } else {
                globalNextBtn.style.opacity = "0.3";
                globalNextBtn.classList.remove('pulse-animation');
            }
        }

        // Tombol process lama (jika masih ada di HTML) bisa disembunyikan saja
        const processBtn = document.getElementById('process');
        if (processBtn) processBtn.style.display = 'none';
    }

    // --- LOGIKA DISABLE/ENABLE TOMBOL NEXT ---
    const filledShots = shots.filter(s => s !== null).length;
    const isFull = (filledShots === maxShots);

    // Tombol orisinil (ID: process)
    const processBtn = document.getElementById('process');
    if (processBtn) {
        processBtn.disabled = !isFull;
        if (isFull) processBtn.classList.add('pulse-animation');
        else processBtn.classList.remove('pulse-animation');
    }

    // Tombol Navigasi Global (ID: globalNext)
    const globalNextBtn = document.getElementById('globalNext');
    if (globalNextBtn) {
        globalNextBtn.disabled = !isFull;
        // Opsional: tambah gaya visual saat aktif
        globalNextBtn.style.opacity = isFull ? "1" : "0.3";
    }
}

async function countdown(sec) {
    countdownEl.style.opacity = 1;
    for (let i = sec; i > 0; i--) {
        countdownEl.textContent = i;
        await new Promise(r => setTimeout(r, 1000));
    }
    countdownEl.style.opacity = 0;
}

shutterBtn.onclick = async () => {
    if (isCounting) return;

    if (shots.length === 0) {
        shots = new Array(maxShots).fill(null);
    }

    let emptyIdx = shots.findIndex(slot => slot === null);

    if (replaceIndex === null && emptyIdx === -1) {
        if (confirm("Slot foto sudah penuh. Ingin reset semua dan ambil ulang?")) {
            shots = new Array(maxShots).fill(null);
            updatePreview();
            emptyIdx = 0;
        } else {
            return;
        }
    }

    isCounting = true;

    const loopStart = (replaceIndex !== null) ? 0 : (emptyIdx === -1 ? 0 : emptyIdx);
    const loopEnd = (replaceIndex !== null) ? 1 : maxShots;

    for (let i = loopStart; i < loopEnd; i++) {
        let targetIndex = (replaceIndex !== null) ? replaceIndex : i;

        if (replaceIndex === null && shots[targetIndex]) continue;
        await countdown(USER_SETTINGS.timer);

        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 300);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.save();
        if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const data = canvas.toDataURL('image/png');
        shots[targetIndex] = data;

        updatePreview();

        if (replaceIndex !== null) {
            replaceIndex = null;
            break;
        }

        if (i < loopEnd - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    isCounting = false;
};

function getContrastColor(hexColor) {
    if (!hexColor) return '#000000';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

window.updateLiveSettings = function () {
    USER_SETTINGS.filter = document.getElementById('filterEditor').value;
    USER_SETTINGS.frameColor = document.getElementById('frameColorEditor').value;
    USER_SETTINGS.storeColor = document.getElementById('storeColorEditor').value;
    USER_SETTINGS.useStoreColor = document.getElementById('useStoreColor').checked;
    USER_SETTINGS.textPrimaryEditor = document.getElementById('textPrimaryEditor').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondaryEditor').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelectEditor').value;
    USER_SETTINGS.dateModeEditor = document.getElementById('dateModeEditor').value;

    const hasBackground = USER_SETTINGS.bgImage !== null;
    const customDateInput = document.getElementById('customDateEditor');
    USER_SETTINGS.customDate = customDateInput.value;
    customDateInput.style.display = (USER_SETTINGS.dateModeEditor === 'custom') ? 'block' : 'none';

    const bgFile = document.getElementById('bgUploadEditor').files[0];
    const isUpload = bgFile !== undefined;
    const removeUploadBtn = document.getElementById('removeUploadBtn');
    const removeTextureBtn = document.getElementById('removeTextureBtn');

    const storeInput = document.getElementById('storeColorEditor');
    const frameInput = document.getElementById('frameColorEditor');
    const storeCheckbox = document.getElementById('useStoreColor');

    USER_SETTINGS.useStoreColor = storeCheckbox.checked;
    USER_SETTINGS.storeColor = storeInput.value;

    storeInput.style.display = storeCheckbox.checked ? 'block' : 'none';

    if (hasBackground) {
        storeInput.style.opacity = "0.4";
        storeInput.style.pointerEvents = "none";
        frameInput.style.opacity = "0.4";
        frameInput.style.pointerEvents = "none";
        storeCheckbox.disabled = true;
    } else {
        storeInput.style.opacity = "1";
        storeInput.style.pointerEvents = "auto";
        frameInput.style.opacity = "1";
        frameInput.style.pointerEvents = "auto";
        storeCheckbox.disabled = false;
        storeInput.style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';
    }

    if (isUpload) {
        storeInput.style.opacity = "0.5";
        frameInput.style.opacity = "0.5";
        storeCheckbox.disabled = true;
    } else {
        storeInput.style.opacity = "1";
        frameInput.style.opacity = "1";
        storeCheckbox.disabled = false;
        storeInput.style.display = USER_SETTINGS.useStoreColor ? 'block' : 'none';
    }

    if (bgFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            USER_SETTINGS.bgImage = e.target.result;
            if (removeUploadBtn) removeUploadBtn.style.display = 'flex';
            if (removeTextureBtn) removeTextureBtn.style.display = 'none';

            document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));

            makeCollage();
        };
        reader.readAsDataURL(bgFile);
    } else {
        makeCollage();
    }
};

window.removeSpecificBg = function (type) {
    USER_SETTINGS.bgImage = null;

    if (type === 'upload') {
        const uploadInput = document.getElementById('bgUploadEditor');
        if (uploadInput) uploadInput.value = '';
        document.getElementById('removeUploadBtn').style.display = 'none';
    } else {
        document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
        document.getElementById('removeTextureBtn').style.display = 'none';
    }

    makeCollage();
};
function syncEditorInputs() {
    if (!document.getElementById('filterEditor')) return;
    document.getElementById('filterEditor').value = USER_SETTINGS.filter;
    document.getElementById('frameColorEditor').value = USER_SETTINGS.frameColor;
    document.getElementById('textPrimaryEditor').value = USER_SETTINGS.textPrimaryEditor;
    document.getElementById('textSecondaryEditor').value = USER_SETTINGS.textSecondary;
    document.getElementById('emojiSelectEditor').value = USER_SETTINGS.emoji;
    document.getElementById('dateModeEditor').value = USER_SETTINGS.dateModeEditor;

    initTextureGallery();

    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) {
        removeBtn.style.display = USER_SETTINGS.bgImage ? 'flex' : 'none';
    }

    const today = new Date().toISOString().split("T")[0];
    document.getElementById('customDateEditor').setAttribute('max', today);
}

window.removeBackground = function () {
    USER_SETTINGS.bgImage = null;

    const uploadInput = document.getElementById('bgUploadEditor');
    if (uploadInput) uploadInput.value = '';

    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) removeBtn.style.display = 'none';

    document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));

    makeCollage();
};

/* ================= COLLAGE LOGIC ================= */
async function makeCollage() {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    const margin = 40;
    const photoW = 375;
    const photoH = 500;
    const isDoubleStrip = maxShots > 3;
    const shotsPerStrip = isDoubleStrip ? Math.ceil(maxShots / 2) : maxShots;
    const singleStripW = photoW + (margin * 2);

    offCanvas.width = isDoubleStrip ? (singleStripW * 2) : singleStripW;
    offCanvas.height = (photoH * shotsPerStrip) + (margin * (shotsPerStrip + 1)) + 180;

    let useFramePNG = false;
    const frameImg = new Image();

    if (USER_SETTINGS.frameID) {
        const currentFramePath = `frame/${maxShots}/${USER_SETTINGS.frameID}.png`;
        frameImg.crossOrigin = "anonymous";
        frameImg.src = `${currentFramePath}?t=${new Date().getTime()}`;

        try {
            await new Promise((resolve) => {
                frameImg.onload = () => {
                    useFramePNG = true;
                    resolve();
                };
                frameImg.onerror = () => {
                    console.warn("Template Frame tidak ditemukan di:", currentFramePath);
                    useFramePNG = false;
                    resolve();
                };
            });
        } catch (e) { useFramePNG = false; }
    }

    // 3. FUNGSI RENDER PER STRIP
    const renderStripSection = async (offsetX, isRightStrip) => {
        const stripRect = { x: offsetX, y: 0, w: singleStripW, h: offCanvas.height };
        let textColor = "#000000";

        // --- A. DRAW BACKGROUND ---
        if (USER_SETTINGS.bgImage) {
            const bgImg = new Image();
            bgImg.src = USER_SETTINGS.bgImage;
            await new Promise(r => bgImg.onload = r);

            const isTexture = USER_SETTINGS.bgImage.includes('texture/');

            drawImageToRect(offCtx, bgImg, stripRect, isTexture ? 'fit' : 'cover');

            if (typeof getAverageColor === 'function') {
                textColor = getContrastColor(getAverageColor(bgImg));
            }
        } else {
            offCtx.fillStyle = USER_SETTINGS.useStoreColor ? USER_SETTINGS.storeColor : USER_SETTINGS.frameColor;
            offCtx.fillRect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);

            if (USER_SETTINGS.useStoreColor) {
                const border = 15;
                offCtx.fillStyle = USER_SETTINGS.frameColor;
                offCtx.fillRect(stripRect.x + border, stripRect.y + border, stripRect.w - (border * 2), stripRect.h - (border * 2));
            }
            textColor = getContrastColor(USER_SETTINGS.frameColor);
        }

        // --- B. DRAW PHOTOS (Di bawah frame) ---
        for (let i = 0; i < shotsPerStrip; i++) {
            let currentIdx = isDoubleStrip
                ? (isRightStrip ? (i * 2 + 1) : (i * 2))
                : i;

            if (currentIdx >= maxShots || !shots[currentIdx]) continue;

            const img = new Image();
            img.src = shots[currentIdx];
            await new Promise(r => img.onload = r);

            const posX = offsetX + margin;
            const posY = margin + i * (photoH + margin);

            offCtx.save();
            offCtx.filter = FILTERS[USER_SETTINGS.filter] || 'none';

            // Cropping otomatis 4:3
            const targetRatio = photoW / photoH;
            const imgRatio = img.width / img.height;
            let sx, sy, sw, sh;
            if (imgRatio > targetRatio) {
                sh = img.height; sw = img.height * targetRatio;
                sx = (img.width - sw) / 2; sy = 0;
            } else {
                sw = img.width; sh = img.width / targetRatio;
                sx = 0; sy = (img.height - sh) / 2;
            }

            offCtx.drawImage(img, sx, sy, sw, sh, posX, posY, photoW, photoH);
            offCtx.restore();

            // Render Emoji
            if (USER_SETTINGS.emoji) {
                offCtx.font = "45px Arial";
                offCtx.fillStyle = textColor;
                offCtx.fillText(USER_SETTINGS.emoji, posX + 20, posY + 50);
            }
        }

        // --- C. DRAW FRAME PNG OVERLAY (Layer paling atas) ---
        if (useFramePNG) {
            offCtx.drawImage(frameImg, offsetX, 0, singleStripW, offCanvas.height);
        }

        // --- D. RENDER TEKS & TANGGAL ---
        offCtx.fillStyle = textColor;
        offCtx.textAlign = "center";
        const centerX = offsetX + (singleStripW / 2);
        let textY = offCanvas.height - 120;

        if (USER_SETTINGS.textPrimaryEditor) {
            offCtx.font = "bold 40px Arial";
            offCtx.fillText(USER_SETTINGS.textPrimaryEditor, centerX, textY);
            textY += 45;
        }
        if (USER_SETTINGS.textSecondary) {
            offCtx.font = "22px Arial";
            offCtx.fillText(USER_SETTINGS.textSecondary, centerX, textY);
        }

        let dateStr = "";
        if (USER_SETTINGS.dateModeEditor === 'auto') {
            const d = new Date();
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } else if (USER_SETTINGS.dateModeEditor === 'custom' && USER_SETTINGS.customDate) {
            const p = USER_SETTINGS.customDate.split('-');
            if (p.length === 3) dateStr = `${p[2]}/${p[1]}/${p[0]}`;
        }

        if (dateStr && USER_SETTINGS.dateModeEditor !== 'off' && USER_SETTINGS.dateModeEditor !== 'without') {
            offCtx.font = "italic 18px Arial";
            offCtx.fillText(dateStr, centerX, offCanvas.height - 35);
        }
    };

    // 4. EKSEKUSI RENDER
    await renderStripSection(0, false);
    if (isDoubleStrip) {
        await renderStripSection(singleStripW, true);
    }

    // 5. UPDATE TAMPILAN CANVAS UTAMA
    const collageCanvas = document.getElementById('collage');
    collageCanvas.width = offCanvas.width;
    collageCanvas.height = offCanvas.height;
    const cctx = collageCanvas.getContext('2d');
    cctx.drawImage(offCanvas, 0, 0);

    // 6. SWITCH SCREEN
    showScreen('resultScreen');
}



function drawZoomedImage(ctx, img, x, y, w, h, zoom) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
        sh = img.height;
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    const zoomW = sw / zoom;
    const zoomH = sh / zoom;
    const zoomX = sx + (sw - zoomW) / 2;
    const zoomY = sy + (sh - zoomH) / 2;

    ctx.drawImage(img, zoomX, zoomY, zoomW, zoomH, x, y, w, h);
}

function getFrameCoordinates(totalShots, index, canvasW, canvasH) {
    const marginSide = canvasW * 0.08;
    const marginTop = canvasH * 0.05;
    const gap = 20;
    const footerSpace = 180;

    let x, y, w, h;

    if (totalShots == 4) {
        w = (canvasW - (marginSide * 2) - gap) / 2;
        h = (canvasH - marginTop - footerSpace - gap) / 2;
        x = marginSide + (index % 2) * (w + gap);
        y = marginTop + Math.floor(index / 2) * (h + gap);
    } else {
        w = canvasW - (marginSide * 2);
        h = (canvasH - marginTop - footerSpace - (gap * (totalShots - 1))) / totalShots;
        x = marginSide;
        y = marginTop + (index * (h + gap));
    }

    return { x, y, w, h };

}

function drawImageToRect(targetCtx, img, rect, mode = 'cover') {
    if (mode === 'fit') {
        targetCtx.drawImage(img, 0, 0, img.width, img.height, rect.x, rect.y, rect.w, rect.h);
    } else {
        const imgRatio = img.width / img.height;
        const rectRatio = rect.w / rect.h;
        let sx, sy, sw, sh;
        if (imgRatio > rectRatio) {
            sh = img.height; sw = img.height * rectRatio;
            sx = (img.width - sw) / 2; sy = 0;
        } else {
            sw = img.width; sh = img.width / rectRatio;
            sx = 0; sy = (img.height - sh) / 2;
        }
        targetCtx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
    }
}

/* ================= EVENT HANDLERS ================= */
const darkModeToggle = document.getElementById('darkModeToggle');

if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    });
}


if (mirrorBtn) {
    mirrorBtn.onclick = () => {
        isMirrored = !isMirrored;
        const videoEl = document.getElementById('video');
        if (isMirrored) {
            videoEl.classList.add('mirrored');
        } else {
            videoEl.classList.remove('mirrored');
        }
    };
}
function resetToDefaultSettings() {
    // 1. Reset Data Objek
    USER_SETTINGS.filter = 'normal';
    USER_SETTINGS.frameColor = '#ffffff';
    USER_SETTINGS.useStoreColor = false;
    USER_SETTINGS.bgImage = null;
    USER_SETTINGS.textPrimaryEditor = '';
    USER_SETTINGS.textSecondary = '';
    USER_SETTINGS.emoji = '';
    USER_SETTINGS.dateModeEditor = 'auto';
    USER_SETTINGS.customDate = '';
    USER_SETTINGS.frameID = null;


    // 2. Reset Visual Input (Layar Editor)
    if (document.getElementById('filterEditor')) {
        document.getElementById('filterEditor').value = 'normal';
        document.getElementById('frameColorEditor').value = '#ffffff';
        document.getElementById('storeColorEditor').value = '#000000';
        document.getElementById('textPrimaryEditor').value = '';
        document.getElementById('textSecondaryEditor').value = '';
        document.getElementById('emojiSelectEditor').value = '';
        document.getElementById('dateModeEditor').value = 'auto';
        document.getElementById('bgUploadEditor').value = '';
    }

    // 3. Reset Filter Kamera
    video.style.filter = FILTERS['normal'];

    // 4. Sembunyikan tombol hapus background
    const removeBtn = document.getElementById('removeBgEditor');
    if (removeBtn) removeBtn.style.display = 'none';

    if (document.getElementById('useStoreColor')) {
        document.getElementById('useStoreColor').checked = false;
        document.getElementById('storeColorEditor').style.display = 'none';
    }
}

function resetBooth() {
    // Reset data seperti biasa
    shots = [];
    currentShot = 0;
    selectedSettings = { timer: null, count: null };

    // Sembunyikan Navigasi Global saat balik ke Start
    const globalNav = document.getElementById('mainNavigation');
    if (globalNav) globalNav.style.display = 'none';

    // Pindah ke start screen
    showScreen('startScreen');

    // Opsional: Jika ingin benar-benar "bersih" seperti reload, 
    // Anda bisa ganti isi fungsi ini dengan: location.reload();
}