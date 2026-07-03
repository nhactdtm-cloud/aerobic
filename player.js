window.albums
window.albumIndex
window.songIndex

function play(input) {

  // =========================
  // 0. TẠO PLAYER BAR (CẬP NHẬT COVER TRÒN XOAY)
  // =========================
  let player = document.querySelector(".player");
  let isFirstLoad = false;

  if (!player) {
    isFirstLoad = true;
    player = document.createElement("div");
    player.className = "player";

    // Thêm keyframe cho hiệu ứng xoay tròn của ảnh bìa vào document
    if (!document.getElementById("player-animation-style")) {
      const style = document.createElement("style");
      style.id = "player-animation-style";
      style.innerHTML = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    player.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      width: 92%;
      max-width: 650px;
      height: 76px;

      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.4);

      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 16px;

      padding: 0 24px;
      border-radius: 38px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
      box-sizing: border-box;
      overflow: hidden;
      z-index: 9999;
      transition: all 0.3s ease;
    `;

    player.innerHTML = `
      <!-- Khối bên trái: Ảnh bìa (HÌNH TRÒN) + Info -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <img id="cover" style="
          width: 48px;
          height: 48px;
          border-radius: 50%; /* Đổi sang hình tròn */
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: spin 12s linear infinite; /* Thêm hiệu ứng xoay tròn */
          animation-play-state: paused; /* Mặc định tạm dừng xoay */
        ">
        
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span id="songDuration" style="
            font-size: 11px;
            color: #ff2d55;
            background: rgba(255, 45, 85, 0.08);
            padding: 2px 8px;
            border-radius: 20px;
            font-weight: 600;
            white-space: nowrap;
            width: max-content;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">--:--</span>

          <span id="songTempo" style="
            font-size: 10px;
            color: #ff9500;
            background: rgba(255, 149, 0, 0.08);
            padding: 2px 8px;
            border-radius: 20px;
            white-space: nowrap;
            width: max-content;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">BPM: --</span>
        </div>
      </div>

      <!-- Khối giữa: Tiêu đề + Nghệ sĩ -->
      <div style="
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        padding: 0 8px;
      ">
        <div id="songTitle" style="
          font-size: 15px;
          font-weight: 600;
          color: #1c1c1e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        "></div>

        <div id="songArtist" style="
          margin-top: 3px;
          font-size: 12px;
          color: #8e8e93;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        "></div>
      </div>

      <!-- Khối bên phải: Nút điều khiển -->
      <div style="display: flex; align-items: center; gap: 20px;">
        <button id="playBtn" style="
          background: none;
          border: none;
          font-size: 22px;
          color: #1c1c1e;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          padding: 0;
        " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">▶</button>

        <button id="nextBtn" style="
          background: none;
          border: none;
          font-size: 22px;
          color: #1c1c1e;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          padding: 0;
        " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">⏭</button>
      </div>

      <audio id="audio"></audio>
    `;
 
document.body.appendChild(player);

player.onclick = (e) => {
    if (e.target.closest("button")) return;

    const song = window.albums[window.albumIndex].songs[window.songIndex];
    controlPanel(song);
};
}

  // =========================
  // 1. GET ELEMENT
  // =========================
  const audio = document.getElementById("audio");
  const cover = document.getElementById("cover");
  const playBtn = document.getElementById("playBtn");
  const nextBtn = document.getElementById("nextBtn");

  const title = document.getElementById("songTitle");
  const artist = document.getElementById("songArtist");
  const songDuration = document.getElementById("songDuration");
  const songTempo = document.getElementById("songTempo");

  // Hàm điều khiển trạng thái xoay của đĩa nhạc dựa theo Audio
  const updateCoverAnimation = () => {
    if (audio.paused) {
      cover.style.animationPlayState = "paused";
    } else {
      cover.style.animationPlayState = "running";
    }
  };

  // =========================
  // 2. GET SONG (ĐÃ SỬA LỖI TRUYỀN ID)
  // =========================
  let song;
  const currentAlbumSongs = window.albums[window.albumIndex].songs;

  if (typeof input === "object" && input !== null) {
    // Tìm bài hát đầy đủ thông tin trong danh sách dựa vào ID truyền vào
    const foundSong = currentAlbumSongs.find(s => s.id === input.id);
    if (foundSong) {
      song = foundSong;
      window.songIndex = currentAlbumSongs.findIndex(s => s.id === input.id);
    } else {
      // Nếu không tìm thấy ID đó, lùi về lấy bài đầu tiên (bài số 0) để không bị lỗi giao diện
      song = currentAlbumSongs[0];
      window.songIndex = 0;
    }
  } else {
    // Nếu truyền vào số thứ tự (index)
    song = currentAlbumSongs[input];
    window.songIndex = input;
  }

  if (!song) return;
  window.currentSong = song;

  // =========================
  // 3. PLAY AUDIO
  // =========================
  audio.src = song.file;

  const isNewPlayer = !document.querySelector(".player") || isFirstLoad;
  
  if (isNewPlayer) {
    // Khi vừa mở trang: Không phát nhạc, đĩa đứng yên
    cover.style.animationPlayState = "paused"; 
  } else {
    // Khi bấm chọn bài khác: Chủ động phát ngay
    audio.play()
      .then(() => {
        playBtn.innerText = "⏸";
        updateCoverAnimation();
      })
      .catch(error => {
        console.log("Phát nhạc bị chặn:", error);
        playBtn.innerText = "▶";
        cover.style.animationPlayState = "paused";
      });
  }

  // =========================
  // 4. UPDATE UI
  // =========================
  cover.src = song.cover;
  title.innerText = song.title;
  artist.innerText = song.artist || "Unknown Artist";
  
  // KIỂM TRA TRẠNG THÁI ĐỂ HIỆN NÚT CHÍNH XÁC:
  if (audio.paused) {
    playBtn.innerText = "▶"; // Nếu nhạc đang dừng (lúc vừa mở web) -> Hiện nút Play
  } else {
    playBtn.innerText = "⏸"; // Nếu nhạc đang phát -> Hiện nút Pause
  }
  
const displayTempo = song.currentTempo ?? song.tempo ?? song.bpm ?? "N/A";

songTempo.innerText =
  typeof displayTempo === "number"
    ? `Tempo: ${displayTempo.toFixed(1)} BPM`
    : `Tempo: ${displayTempo} BPM`;

  audio.onloadedmetadata = () => {
    const minutes = Math.floor(audio.duration / 60);
    const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
    songDuration.innerText = `${minutes}:${seconds}`;
  };


  // =========================
  // 5. EVENT LISTENERS
  // =========================
  if (isFirstLoad) {
    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play();
        playBtn.innerText = "⏸";
      } else {
        audio.pause();
        playBtn.innerText = "▶";
      }
      updateCoverAnimation();
    };

    nextBtn.onclick = () => {
      let nextIndex = window.songIndex + 1;
      if (nextIndex >= window.albums[window.albumIndex].songs.length) {
        nextIndex = 0;
      }
      play(nextIndex);
    };

    audio.onended = () => {
      nextBtn.click();
    };
  }

  // =========================
  // 6. ACTIVE SONG (OPTIONAL)
  // =========================
  document.querySelectorAll(".song").forEach(el => {
    el.classList.remove("active");
    if (el.dataset.id === String(song.id)) {
      el.classList.add("active");
    }
  });
}

function controlPanel(song) {
  const audio = document.getElementById("audio");
  const player = document.querySelector(".player");
  let panel = document.getElementById("controlPanel");

  // Lấy tempo gốc từ dữ liệu bài hát
  const ORIGINAL_BPM = song.tempo || 160.0; 
  const MIN_BPM = 128.0;
  const MAX_BPM = 180.0; // Cho phép tăng thêm



  // =========================
  // 1. TẠO PANEL NẾU CHƯA TỒN TẠI
  // =========================
if (!panel) {
    panel = document.createElement("div");
    panel.id = "controlPanel";

    // Cấu trúc HTML thiết kế 3 vùng thông minh dàn đều từ trái sang phải
    panel.innerHTML = `
      <div class="cp-box">

        <!-- THÂN PANEL LIỀN MẠCH, ĐẦY ĐỦ KHOẢNG TRỐNG -->
        <div class="cp-main-layout">
          
          <!-- KHỐI 1: TRACK INFO & SEEK BAR (CHIẾM VÙNG TRÁI RỘNG) -->
          <div class="cp-sub-box section-left" style="flex: 2; display:flex; flex-direction:column; min-height:100%; min-width:0; width:0;">

            <!-- Ép chiều rộng vùng text bằng 100% để kích hoạt ellipsis -->
            <div style="flex-shrink:0; width:100%; overflow:hidden;">
              <div id="cpTitle" class="cp-title">Mất Kết Nối - Eoxi 2024</div>
              <div id="cpArtist" class="cp-artist">DJ Master Bi</div>
            </div>

            <div style="flex:1;"></div>

            <div style="flex-shrink:0; width:100%;">
              <input id="seekBar" type="range" min="0" max="100" value="0">

              <div class="cp-time-row">
                <span id="cpCurrentTime">00:00</span>
                <span id="cpDuration">00:00</span>
              </div>
            </div>

          </div>

          <!-- KHỐI 3: CONTROLS COLUMN (VOLUME & TEMPO - ĐẶT Ở BÊN PHẢI NGOÀI CÙNG) -->
          <div class="section-right-controls" style="flex: 1.5; min-width:0;">
            
            <!-- Hộp Volume -->
            <div class="cp-sub-box">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px;color:#212121;font-weight:600;">
                <span>🔊 Volume</span>
                <span id="volumeVal" class="cp-badge-val">100%</span>
              </div>
              <input id="volumeBar" type="range" min="0" max="1" step="0.01" value="1">
            </div>

            <!-- Hộp Tempo (Giới hạn từ 128 đến Tempo gốc) -->
            <div class="cp-sub-box">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px;color:#212121;font-weight:600;">
                <span>⚡ Tempo</span>
                <span id="tempoVal" class="cp-badge-val" style="background:#C84B31;color:#FDFBF7;">128.0</span>
              </div>
              <input id="tempoBar" type="range" min="${MIN_BPM}" max="${MAX_BPM}" step="0.1" value="128">
            </div>

          </div>

        </div>

        <!-- FOOTER: NÚT PLAYLIST & NÚT ĐÓNG DÀN HÀNG NGANG ĐÁY BOX -->
        <div style="display:flex; gap:10px; width:100%;">
          <button id="playlistBtn" style="flex: 1;">
            ➕ Thêm vào bộ sưu tập
          </button>
          <button id="closePanel" style="width: 100px; background:#e2dfd9; color:#212121; font-weight:700; border:none; border-radius:12px; cursor:pointer;">
             ❌
          </button>
        </div>

      </div>
    `;

    // Thiết lập khung ngoài ôm trọn không gian (max-width lớn hơn để tràn màn hình)
    panel.style.cssText = `
      position:fixed;
      left:50%;
      transform:translateX(-50%);
      bottom:20px;
      width:94%;
      max-width:850px;
      height:215px;

      background:#FDFBF7;
      border:2px solid #1E4233;
      border-radius:24px;

      display:none;
      padding:12px;
      box-sizing:border-box;
      z-index:99999;
      box-shadow:0 14px 36px rgba(30,66,51,0.15);
      font-family:system-ui, -apple-system, sans-serif;
    `;

    panel.querySelector(".cp-box").style.cssText = `
      display:flex;
      flex-direction:column;
      gap:10px;
      height:100%;
      width:100%;
      overflow:hidden; /* Ngăn chặn hoàn toàn tràn box */
    `;

    // CSS Engine để dựng bố cục 3 vùng thông minh trải dài lấp khoảng trống
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      #controlPanel .cp-title,
      #controlPanel .cp-artist {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block; /* Đảm bảo thuộc tính ẩn chữ hoạt động */
        width: 100%;
      }

      #controlPanel .cp-title {
        font-size: 16px;
        font-weight: bold;
        color: #212121;
      }

      #controlPanel .cp-artist {
        font-size: 13px;
        color: #6b7280;
        margin-top: 2px;
      }

      #controlPanel .cp-sub-box {
        min-width: 0;
      }

      #controlPanel .cp-time-row {
        display:flex;
        justify-content:space-between;
        font-size:11px;
        color:#6b7280;
        font-family:monospace;
        margin-top:4px;
      }

      #controlPanel .cp-main-layout {
        display: flex;
        gap: 10px;
        flex: 1;
        min-width: 0; /* Ép flex layout không phình to quá cha */
      }
      #controlPanel .section-right-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #controlPanel .cp-sub-box {
        background: #ffffff;
        border: 1px solid rgba(30, 66, 51, 0.12);
        border-radius: 14px;
        padding: 10px 14px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      /* Định dạng cột hiển thị số liệu tương tác */
      #controlPanel .section-stats {
        align-items: flex-start;
        justify-content: center;
        gap: 4px;
      }
      #controlPanel .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      #controlPanel .stat-label {
        font-size: 10px;
        color: #777;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #controlPanel .stat-value {
        font-size: 13px;
        font-weight: 700;
        color: #212121;
        font-family: monospace;
      }
      #controlPanel .cp-badge-val {
        font-family: monospace;
        font-weight: 700;
        color: #1E4233;
        background: rgba(30, 66, 51, 0.08);
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      #controlPanel #playlistBtn {
        padding: 11px;
        border-radius: 12px;
        border: none;
        background: #1E4233;
        color: #FDFBF7;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 3px 0 #12291f;
      }
      #controlPanel #playlistBtn:active {
        transform: translateY(1px);
        box-shadow: 0 2px 0 #12291f;
      }
      /* Custom Sliders */
      #controlPanel input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: #e2dfd9;
        border-radius: 999px;
        outline: none;
        margin: 4px 0;
      }
      #controlPanel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #1E4233;
        cursor: pointer;
      }
      #controlPanel #tempoBar::-webkit-slider-thumb {
        background: #C84B31;
      }
    `;
    document.head.appendChild(styleSheet);
    document.body.appendChild(panel);


const tempoBar = panel.querySelector("#tempoBar");
const tempoVal = panel.querySelector("#tempoVal");
const audio = document.getElementById("audio");

const bpm = song.currentTempo ?? song.tempo ?? 160;

tempoBar.min = MIN_BPM;
tempoBar.max = MAX_BPM;
tempoBar.step = 0.1;


tempoBar.value = Math.min(bpm, MAX_BPM);
tempoVal.innerText = Number(tempoBar.value).toFixed(1);

audio.playbackRate = Number(tempoBar.value) / bpm;


  // Xử lý khi người dùng kéo thanh tempo
  tempoBar.oninput = () => {
    let currentBpm = parseFloat(tempoBar.value);

    if (currentBpm < MIN_BPM) currentBpm = MIN_BPM;
    if (currentBpm > MAX_BPM) currentBpm = MAX_BPM;

    audio.playbackRate = currentBpm / ORIGINAL_BPM;
    tempoVal.innerText = currentBpm.toFixed(1);
  };


    // ======================
    // 2. XỬ LÝ SỰ KIỆN & SỐ LIỆU LOGIC
    // ======================
    const seek = panel.querySelector("#seekBar");
    const vol = panel.querySelector("#volumeBar");
    const tempo = panel.querySelector("#tempoBar");

    const cpCurrentTime = panel.querySelector("#cpCurrentTime");
    const cpDuration = panel.querySelector("#cpDuration");
    const volumeVal = panel.querySelector("#volumeVal");

    const formatTime = (secs) => {
      if (isNaN(secs)) return "00:00";
      const m = Math.floor(secs / 60).toString().padStart(2, "0");
      const s = Math.floor(secs % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    seek.oninput = () => {
      if (!audio.duration) return;
      audio.currentTime = (seek.value / 100) * audio.duration;
    };

    vol.oninput = () => {
      audio.volume = vol.value;
      volumeVal.innerText = `${Math.round(vol.value * 100)}%`;
    };

tempoBar.oninput = () => {
    const currentBpm = Number(tempoBar.value);

    song.currentTempo = currentBpm;

    audio.playbackRate = currentBpm / ORIGINAL_BPM;
    tempoVal.innerText = currentBpm.toFixed(1);

    const songTempo = document.getElementById("songTempo");
    if (songTempo) {
        songTempo.innerText = `Tempo: ${currentBpm.toFixed(1)} BPM`;
    }
};

    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      seek.value = (audio.currentTime / audio.duration) * 100;
      cpCurrentTime.innerText = formatTime(audio.currentTime);
      cpDuration.innerText = formatTime(audio.duration);
    };

    panel.querySelector("#closePanel").onclick = () => {
      panel.style.display = "none";
      player.style.display = "grid";
    };

panel.querySelector("#playlistBtn").onclick = async (e) => {
  e.stopPropagation();
    console.log("CLICK PLAYLIST");

    const rect = e.currentTarget.getBoundingClientRect();

    await window.showPlaylistDropdown(
        rect.left,
        rect.bottom,
        window.currentSong
    );

    console.log("ĐÃ THOÁT showPlaylistDropdown");
};

    vol.value = audio.volume;
    volumeVal.innerText = `${Math.round(audio.volume * 100)}%`;
    

}

// ======================
// 3. ĐỒNG BỘ DỮ LIỆU ĐỘNG TỪ GIAO DIỆN CHÍNH
// ======================

panel.querySelector("#cpTitle").innerText =
  document.getElementById("songTitle")?.innerText || "Mất Kết Nối - Eoxi 2024";

panel.querySelector("#cpArtist").innerText =
  document.getElementById("songArtist")?.innerText || "DJ Master Bi";

if (audio.duration) {
  panel.querySelector("#cpDuration").innerText =
    Math.floor(audio.duration / 60).toString().padStart(2, "0") + ":" +
    Math.floor(audio.duration % 60).toString().padStart(2, "0");
}

// ======================
// 4. HIỂN THỊ TRẠNG THÁI
// ======================

panel.style.display = "flex";
player.style.display = "none";
} 


function next(){
  const songs = window.albums[window.albumIndex].songs;
  window.songIndex = (window.songIndex + 1) % songs.length;
  play(window.songIndex);
}

function prev(){
const songs = window.albums[window.albumIndex].songs;

window.songIndex =
    (window.songIndex - 1 + songs.length) % songs.length;

play(window.songIndex);
}

//========== Hiện Player =========================================
const autoRenderPlayer = () => {
  if (window.albums && window.albums[window.albumIndex]) {
    // Thay đổi số 99 thành id chính xác của bài hát bạn muốn cài
    play({ id: "2f22ea86-552e-448a-ab97-202d83f3e1bf" }); 
  } else {
    setTimeout(autoRenderPlayer, 100);
  }
};
autoRenderPlayer();
