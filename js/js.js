/* ================= CONFIGURATION ================= */
const FILTERS = {
    normal: 'none',
    bw: 'grayscale(1)',
    vintage: 'sepia(.45) contrast(.95)',
    soft: 'brightness(1.08) saturate(1.1)',
    country: 'sepia(.25) saturate(1.2)',
    dv: 'contrast(1.3) saturate(.8)',
    instax: 'contrast(1.2) saturate(1.4)'
};

const USER_SETTINGS = {
    timer: 3,
    count: 2,
    filter: 'normal',
    frameColor: '#ffffff',
    storeColor: '#000000',
    useStoreColor: false,
    bgImage: null,
    textPrimary: '',
    textSecondary: '',
    emoji: '',
    dateMode: 'auto',
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

/* ================= STATE ================= */
let shots = [];
let maxShots = 2;
let currentShot = 0;
let replaceIndex = null;
let isCounting = false;
let activeFilter = 'normal';
let currentStep = 1;
let isMirrored = true;

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

/* ================= MULTI-STEP NAVIGATION ================= */
function goToStep(step) {
    const totalSteps = 3;

    document.querySelectorAll('.editor-step').forEach(el => el.classList.remove('active'));
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) targetStep.classList.add('active');

    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const finalActions = document.getElementById('finalActions');

    if (prevBtn) prevBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';

    if (step === totalSteps) {
        nextBtn.textContent = "Download & Finish";
        nextBtn.classList.add('download-mode');
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

            setTimeout(() => {
                resetBooth();
            }, 1000);
        }
    }
};
document.getElementById('prevStep').onclick = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
};

/* ================= MODAL LOGIC ================= */
function closeAllModal() {
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('active');
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-modal');
        const modal = document.getElementById(targetId);
        if (modal) {
            closeAllModal();
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    });
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) closeAllModal();
};

/* ================= SETTINGS SAVING ================= */
document.getElementById('saveShot').onclick = () => {
    USER_SETTINGS.timer = +document.getElementById('timer').value;
    USER_SETTINGS.count = +document.getElementById('count').value;
    maxShots = USER_SETTINGS.count;
    shots = [];
    updatePreview();
    closeAllModal();
};

document.getElementById('saveStyle').onclick = () => {
    USER_SETTINGS.filter = document.getElementById('filter').value;
    USER_SETTINGS.frameColor = document.getElementById('frameColor').value;

    const bgFile = document.getElementById('bgUpload').files[0];
    if (bgFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            USER_SETTINGS.bgImage = e.target.result;
            makeCollage();
            closeAllModal();
        };
        reader.readAsDataURL(bgFile);
    } else {
        USER_SETTINGS.bgImage = null;
        makeCollage();
        closeAllModal();
    }
};

function applyStyleSettings() {
    activeFilter = USER_SETTINGS.filter;
    video.style.filter = FILTERS[activeFilter];
    closeAllModal();
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

    // Kembalikan dalam format hex agar bisa dibaca fungsi getContrastColor kamu
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

document.getElementById('saveText').onclick = () => {
    USER_SETTINGS.textPrimary = document.getElementById('textPrimary').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondary').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelect').value;
    USER_SETTINGS.dateMode = document.getElementById('dateMode').value;
    USER_SETTINGS.customDate = document.getElementById('customDate').value;

    makeCollage();
    closeAllModal();
};
document.getElementById('dateMode').onchange = (e) => {
    const customInput = document.getElementById('customDate');
    if (e.target.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
};

/* ================= CORE FUNCTIONS ================= */
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
        } else {

        }
        previewStrip.appendChild(box);
    }

    const filledShots = shots.filter(s => s !== null).length;
    document.getElementById('process').disabled = (filledShots !== maxShots);
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
        console.log(`Mengambil foto ke-${targetIndex + 1}`);
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

        // --- SIMPAN DATA ---
        const data = canvas.toDataURL('image/png');
        shots[targetIndex] = data;

        updatePreview();

        // Jika mode ganti foto (replace) selesai, langsung stop loop
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
    USER_SETTINGS.textPrimary = document.getElementById('textPrimaryEditor').value;
    USER_SETTINGS.textSecondary = document.getElementById('textSecondaryEditor').value;
    USER_SETTINGS.emoji = document.getElementById('emojiSelectEditor').value;
    USER_SETTINGS.dateMode = document.getElementById('dateModeEditor').value;

    const hasBackground = USER_SETTINGS.bgImage !== null;
    const customDateInput = document.getElementById('customDateEditor');
    USER_SETTINGS.customDate = customDateInput.value;
    customDateInput.style.display = (USER_SETTINGS.dateMode === 'custom') ? 'block' : 'none';

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
    const frames = ['1', '2', '3', '4','5','6','7','8','9','10'];

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
            // Logika Pilih Frame
            USER_SETTINGS.frameID = id;
            
            document.querySelectorAll('#frameTemplateGallery .texture-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Munculkan tombol hapus saat frame dipilih
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
    document.getElementById('textPrimaryEditor').value = USER_SETTINGS.textPrimary;
    document.getElementById('textSecondaryEditor').value = USER_SETTINGS.textSecondary;
    document.getElementById('emojiSelectEditor').value = USER_SETTINGS.emoji;
    document.getElementById('dateModeEditor').value = USER_SETTINGS.dateMode;

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

    // 1. TENTUKAN UKURAN DASAR (Sesuai Logika Strip)
    const margin = 40;
    const photoW = 375;
    const photoH = 500;
    const isDoubleStrip = maxShots > 3;
    const shotsPerStrip = isDoubleStrip ? Math.ceil(maxShots / 2) : maxShots;
    const singleStripW = photoW + (margin * 2);

    offCanvas.width = isDoubleStrip ? (singleStripW * 2) : singleStripW;
    offCanvas.height = (photoH * shotsPerStrip) + (margin * (shotsPerStrip + 1)) + 180;

    // 2. LOAD FRAME TEMPLATE (Hanya jika ada frameID yang dipilih)
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

        if (USER_SETTINGS.textPrimary) {
            offCtx.font = "bold 40px Arial";
            offCtx.fillText(USER_SETTINGS.textPrimary, centerX, textY);
            textY += 45;
        }
        if (USER_SETTINGS.textSecondary) {
            offCtx.font = "22px Arial";
            offCtx.fillText(USER_SETTINGS.textSecondary, centerX, textY);
        }

        let dateStr = "";
        if (USER_SETTINGS.dateMode === 'auto') {
            const d = new Date();
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } else if (USER_SETTINGS.dateMode === 'custom' && USER_SETTINGS.customDate) {
            const p = USER_SETTINGS.customDate.split('-');
            if (p.length === 3) dateStr = `${p[2]}/${p[1]}/${p[0]}`;
        }

        if (dateStr && USER_SETTINGS.dateMode !== 'off' && USER_SETTINGS.dateMode !== 'without') {
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
    const collage = document.getElementById('collage');
    const cctx = collage.getContext('2d');
    collage.width = offCanvas.width;
    collage.height = offCanvas.height;
    cctx.drawImage(offCanvas, 0, 0);

    // 6. SWITCH SCREEN
    document.getElementById('boothScreen').style.display = 'none';
    const resultScreen = document.getElementById('resultScreen');
    resultScreen.style.display = 'flex';
    resultScreen.classList.add('active');
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
        // Mode Grid 2x2
        w = (canvasW - (marginSide * 2) - gap) / 2;
        h = (canvasH - marginTop - footerSpace - gap) / 2;
        x = marginSide + (index % 2) * (w + gap);
        y = marginTop + Math.floor(index / 2) * (h + gap);
    } else {
        // Mode Strip Vertikal (untuk 2 atau 3 foto)
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
document.getElementById('process').onclick = () => {
    maxShots = USER_SETTINGS.count;
    USER_SETTINGS.frameID = null;
    USER_SETTINGS.frameColor = '#ffffff';
    USER_SETTINGS.bgImage = null;
    initFrameGallery();
    syncEditorInputs();
    makeCollage();
};

if (mirrorBtn) {
    mirrorBtn.onclick = () => {
        isMirrored = !isMirrored;

        if (isMirrored) {
            video.classList.add('mirrored');
        } else {
            video.classList.remove('mirrored');
        }
        console.log("Mirror mode:", isMirrored);
    };
}

function resetToDefaultSettings() {
    // 1. Reset Data Objek
    USER_SETTINGS.filter = 'normal';
    USER_SETTINGS.frameColor = '#ffffff';
    USER_SETTINGS.useStoreColor = false;
    USER_SETTINGS.bgImage = null;
    USER_SETTINGS.textPrimary = '';
    USER_SETTINGS.textSecondary = '';
    USER_SETTINGS.emoji = '';
    USER_SETTINGS.dateMode = 'auto';
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
    shots = [];
    currentShot = 0;
    replaceIndex = null;
    resultScreen.style.display = 'none';
    boothScreen.style.display = 'grid';
    goToStep(1);
    updatePreview();

    resultScreen.classList.remove('active');
    resultScreen.style.display = 'none';
    boothScreen.style.display = 'grid';
    boothScreen.classList.add('active');
}