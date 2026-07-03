window.albums = [];
window.albumIndex = 0;
window.songIndex = 0;
let currentAlbumIndex = -1;
let isLibraryMode = false;
let libraryAlbums = [];

async function loadData() {
  const res = await fetch("./data/songs.json");
  const data = await res.json();

  // 🔥 SORT THEO NGÀY (mới → cũ)
  const sortedByDate = [...data].sort((a, b) => {
    return parseVNDate(b.date) - parseVNDate(a.date);
  });

  // 🔥 LẤY BÀI HÁT MỚI
  const newSongs = sortedByDate.slice(0, 10);

// Khởi tạo albums chính
window.albums = [
  {
    name: "Tất cả bài hát",
    songs: data // ✅ ĐÃ SỬA: từ "da" thành "data"
  },
  {
    name: "Bài hát mới",
    songs: newSongs
  },
  {
    name: "Thư viện của tôi",
    songs: []
  }
];


  // ❌ chỉ render 1 lần
  renderAlbums();

  // 🔥 reset filter UI an toàn
  const filterInput = document.getElementById("musicFilter");
  if (filterInput) {
    filterInput.value = "all";
  }

  // 🔥 filter an toàn
  if (typeof filterSongs === "function") {
    filterSongs();
  }

  // UI updates an toàn
  updateTempoUI?.();
  bindTempo?.();

}


document.addEventListener("DOMContentLoaded", loadData);

const songList = document.getElementById("songList");

/* ===== BPM ===== */
const bpms = [145,150,155,160,165,168,170,173,175];
let bpmIndex = 3; // 🔥 start 160
const DEFAULT_BPM_INDEX = 3; // 160
 

function getBpm(i){
  const len = bpms.length;
  return bpms[(i + len) % len]; // 🔥 xoay vòng
}

/* ===== LOGIN CHECK (giữ nếu bạn dùng) ===== */
function isLoggedIn(){
  return localStorage.getItem("loggedIn") === "true";
}


function loadAlbum(i) {
  window.albumIndex = i;
  currentAlbumIndex = i;

  const source = isLibraryMode ? libraryAlbums : albums;
  const album = source[i];

  renderSongs();
}

function backToMainAlbums() {
  isLibraryMode = false;

  // khôi phục lại data gốc bằng reload
  loadData();
}

async function loadMyLibrary() {
  const mySongs = await getMyPlaylistSongs();

  libraryAlbums = [
    {
      name: "Nhạc của tôi",
      songs: mySongs
    },
    {
      name: "Yêu thích",
      songs: mySongs.filter(s => s.liked)
    }
  ];

  window.albums = libraryAlbums;
  isLibraryMode = true;

  renderAlbums();
  loadAlbum(0);

  // 🔥 HIỆN NÚT QUAY LẠI
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.style.display = "block";
}


function getMyPlaylistSongs() {
  const username = (localStorage.getItem("username") || "guest").toLowerCase().trim();
console.log("albums:", window.albums);
  return (window.albums[0]?.songs || []).filter(s =>
    (s.username || "").toLowerCase().trim() === username
  );
}

// ==================== 2. HIỂN THỊ DANH SÁCH ALBUMS ====================
function renderAlbums(){ 
    const fixed = document.getElementById("albumFixed");
    const list = document.getElementById("albumList");

    fixed.innerHTML = "";
    list.innerHTML = "";

    const source = window.albums;

    source.forEach((a, i) => {
        const div = document.createElement("div");
        div.className = "album";
        div.innerText = a.name;

        // highlight thư viện
        if (a.name === "Thư viện của tôi") {
            div.style.color = "black";
        }

        div.onclick = () => {
            // 🔥 nếu bấm nút thư viện
            if (a.name === "Thư viện của tôi") {
                loadMyLibrary();
                return;
            }

            loadAlbum(i);
        };

        // 🔥 tách layout
        if (i < 4) {
            fixed.appendChild(div);
        } else {
            list.appendChild(div);
        }
    });
}

// ==================== 3. HIỂN THỊ DANH SÁCH BÀI HÁT ====================
function renderSongs(){ 
    songList.innerHTML = ""; 
    
    const currentAlbum = window.albums[window.albumIndex];
    if (!currentAlbum) return;

    // LỌC NHẠC CHO CÁC ALBUM KHÁC:
    // Nếu là album "Nhạc Của Tôi" -> Giữ nguyên danh sách (đầy đủ private + public của user)
    // Nếu là các album khác -> Loại bỏ các bài hát có trạng thái "private"
    const songsToRender = currentAlbum.name === "Nhạc Của Tôi" 
        ? currentAlbum.songs 
        : currentAlbum.songs.filter(s => s.visibility !== "private");

    // Duyệt qua danh sách bài hát sau khi đã lọc để hiển thị lên giao diện
    songsToRender.forEach((s, i) => { 
        const div = document.createElement("div"); 
        div.className = "song"; 
        
        div.innerHTML = `
            <div class="song-meta"> 
            
<div class="song-item-title">
  <a href="#" class="song-title-link">${s.title}</a>
</div> 

<div class="song-item-artist">
  ${s.artist} ● ${s.isrc}
</div>
            </div>
        `; 

        const titleLink = div.querySelector(".song-title-link");

  titleLink.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation(); 
  openInfoModal(s);
};


        div.dataset.id = s.id; 

        // Cấu hình CSS cho dòng bài hát
        div.style.display = "flex"; 
        div.style.justifyContent = "space-between"; 
        div.style.alignItems = "center"; 

        const currentUsername = localStorage.getItem("username");
const actionBox = document.createElement("div");
actionBox.style.display = "flex";
actionBox.style.alignItems = "center";

if (s.username === currentUsername) {

    const statusBtn = document.createElement("span");
    statusBtn.innerText = "●";
    statusBtn.title = s.visibility === "public"
        ? "Công khai"
        : "Cá nhân";

    statusBtn.style.cursor = "default";
    statusBtn.style.padding = "0";
    statusBtn.style.marginRight = "2px";
    statusBtn.style.fontWeight = "bold";
    statusBtn.style.fontSize = "18px";

    if (s.visibility === "public") {
        statusBtn.style.color = "#22c55e";
    } else {
        statusBtn.style.color = "#ef4444";
    }

    actionBox.appendChild(statusBtn);
}

        // Tạo nút dấu cộng (➕)
        const btnAdd = document.createElement("span"); 
        btnAdd.innerText = " ➕"; 
        btnAdd.title = "Thêm vào bộ sưu tập"; 
        btnAdd.style.cursor = "pointer"; 
        btnAdd.style.padding = "0";
        btnAdd.style.fontWeight = "bold"; 

        btnAdd.onclick = (e) => { 
            e.stopPropagation(); 
            if (typeof showPlaylistDropdown === 'function') { 
                showPlaylistDropdown(e.clientX, e.clientY, s); 
            } else { 
                console.error("Không tìm thấy hàm showPlaylistDropdown"); 
            } 
        }; 

        actionBox.appendChild(btnAdd);
div.appendChild(actionBox);

        // Sự kiện phát nhạc
        div.onclick = () => { 
            if (typeof play === 'function') play(s); 
        }; 

        songList.appendChild(div); 
    }); 
}


//== Info song

function openInfoModal(song) {
  document.getElementById("infoModal")?.remove();
  const currentUser = localStorage.getItem("username");

  // 1. Overlay nền mờ
  const modal = document.createElement("div");
  modal.id = "infoModal";
  Object.assign(modal.style, {
    position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(6px)", webkitBackdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: "9999", opacity: "0", transition: "opacity 0.25s ease"
  });

  // 2. Hộp thoại cố định hình chữ nhật nằm ngang (560px x 280px)
  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "relative", background: "#FDFBF7", border: "2px solid rgba(30, 66, 51, 0.15)",
    padding: "24px", borderRadius: "16px", width: "560px", height: "280px",
    boxSizing: "border-box", color: "#212121", boxShadow: "0 16px 36px rgba(30, 66, 51, 0.12)",
    fontFamily: "system-ui, -apple-system, sans-serif", transform: "scale(0.95) translateY(10px)",
    transition: "transform 0.25s ease", display: "flex", gap: "20px", alignItems: "stretch"
  });

  // 3. Nút đóng
  const close = document.createElement("span");
  close.innerHTML = "&times;";
  Object.assign(close.style, {
    position: "absolute", top: "12px", right: "18px", cursor: "pointer", fontSize: "26px",
    color: "#1E4233", opacity: "0.6", transition: "color 0.2s, opacity 0.2s", lineHeight: "1", zIndex: "10"
  });
  close.onmouseover = () => { close.style.color = "#C84B31"; close.style.opacity = "1"; };
  close.onmouseout = () => { close.style.color = "#1E4233"; close.style.opacity = "0.6"; };
  close.onclick = closeInfoModal;

  // 4. KHỐI CHỨA ẢNH BÌA BÊN TRÁI
  const coverWrapper = document.createElement("div");
  Object.assign(coverWrapper.style, {
    position: "relative", width: "140px", height: "140px", flexShrink: "0", alignSelf: "center", borderRadius: "12px", overflow: "hidden"
  });

  const coverImg = document.createElement("img");
  coverImg.src = song.cover || "";
  coverImg.alt = "Cover";
  Object.assign(coverImg.style, {
    width: "100%", height: "100%", objectFit: "cover",
    border: "1px solid rgba(30, 66, 51, 0.1)", boxShadow: "0 8px 20px rgba(30, 66, 51, 0.1)"
  });

  // Tạo input file ẩn để chọn ảnh mới
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  // Biến lưu trữ dữ liệu ảnh mới (Base64)
  let newCoverBase64 = null;

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        coverImg.src = event.target.result; 
        newCoverBase64 = event.target.result; 
      };
      reader.readAsDataURL(file);
    }
  };

  coverWrapper.append(coverImg, fileInput);

  // 5. Khối nội dung cuộn bên phải
  const scrollContainer = document.createElement("div");
  Object.assign(scrollContainer.style, {
    flex: "1", overflowY: "auto", paddingRight: "8px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px"
  });

  // Chèn style css cho giao diện cuộn và hover đổi ảnh
  const styleTag = document.createElement("style");
  styleTag.id = "infoModalStyle";
  styleTag.innerText = `
    #infoModalContent::-webkit-scrollbar { width: 5px; }
    #infoModalContent::-webkit-scrollbar-track { background: transparent; }
    #infoModalContent::-webkit-scrollbar-thumb { background: rgba(30, 66, 51, 0.2); border-radius: 4px; }
    #infoModalContent::-webkit-scrollbar-thumb:hover { background: #1E4233; }
    .retro-input { width: 100%; border: 1px solid rgba(30, 66, 51, 0.3); background: #FDFBF7; color: #212121; font-size: 13px; font-weight: 500; padding: 4px 8px; border-radius: 4px; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
    .retro-input:focus { border-color: #C84B31; }
    .cover-editable { cursor: pointer; position: relative; }
    .cover-editable:hover img { filter: brightness(0.6); }
    .cover-editable::after { content: "✎ Đổi ảnh"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s; pointer-events: none; }
    .cover-editable:hover::after { opacity: 1; }
  `;
  scrollContainer.id = "infoModalContent";
  
  // Dọn dẹp style cũ tránh trùng lặp trước khi chèn mới
  document.getElementById("infoModalStyle")?.remove();
  document.head.appendChild(styleTag);

  // --- TRẠNG THÁI XEM THÔNG TIN ---
  const title = document.createElement("h2");
  title.innerText = song.title || "Không rõ tiêu đề";
  Object.assign(title.style, { margin: "0", fontSize: "20px", fontWeight: "700", color: "#1E4233", letterSpacing: "-0.5px", paddingRight: "20px", wordBreak: "break-word" });

  const infoGrid = document.createElement("div");
  Object.assign(infoGrid.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" });

  const createInfoField = (label, value) => {
    const div = document.createElement("div");
    div.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 2px;">${label}</span>` +
                    `<div style="color: #212121; font-size: 13.5px; font-weight: 500; word-break: break-all;">${value || "---"}</div>`;
    Object.assign(div.style, { minWidth: "0", background: "rgba(30, 66, 51, 0.04)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(30, 66, 51, 0.05)" });
    return div;
  };

  const artistField = createInfoField("Nghệ sĩ", song.artist);
  const isrcField = createInfoField("Mã ISRC", song.isrc);
  const genreField = createInfoField("Thể loại", song.genre);
  const userField = createInfoField("Người đăng", song.username);
  const dateField = createInfoField("Ngày đăng", song.date);
  dateField.style.gridColumn = "span 2";

  infoGrid.append(artistField, isrcField, genreField, userField, dateField);

  const bottomContainer = document.createElement("div");
  Object.assign(bottomContainer.style, { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", borderTop: "1px dashed rgba(30, 66, 51, 0.15)", paddingTop: "10px", marginTop: "auto" });

  const descContainer = document.createElement("div");
  Object.assign(descContainer.style, { fontSize: "12.5px", color: "#212121", opacity: "0.8", fontStyle: "italic", lineHeight: "1.4", wordBreak: "break-word", flex: "1" });
  descContainer.innerText = song.mota_text ? `“ ${song.mota_text} ”` : "Không có mô tả.";
  bottomContainer.appendChild(descContainer);

  if (song.username && song.username === currentUser) {
    const editBtn = document.createElement("button");
    editBtn.innerHTML = "&#9998; Chỉnh sửa";
    Object.assign(editBtn.style, { cursor: "pointer", background: "#C84B31", color: "#FDFBF7", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", transition: "background 0.2s", boxShadow: "0 2px 6px rgba(200, 75, 49, 0.2)" });
    editBtn.onmouseover = () => editBtn.style.background = "#1E4233";
    editBtn.onmouseout = () => editBtn.style.background = "#C84B31";
    
    // KHI BẤM CHỈNH SỬA
    editBtn.onclick = (e) => {
      e.stopPropagation();
      
      coverWrapper.classList.add("cover-editable");
      coverWrapper.onclick = () => fileInput.click();

      title.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; display:block; margin-bottom:4px;">Tiêu đề bài hát</span>` +
                        `<input type="text" id="edit-title" class="retro-input" value="${song.title || ''}">`;

      artistField.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; display:block; margin-bottom:2px;">Nghệ sĩ</span>` +
                              `<input type="text" id="edit-artist" class="retro-input" value="${song.artist || ''}">`;
      
      isrcField.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; display:block; margin-bottom:2px;">Mã ISRC</span>` +
                            `<input type="text" id="edit-isrc" class="retro-input" value="${song.isrc || ''}">`;
      
      genreField.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; display:block; margin-bottom:2px;">Thể loại</span>` +
                             `<input type="text" id="edit-genre" class="retro-input" value="${song.genre || ''}">`;

      descContainer.innerHTML = `<span style="color: #1E4233; opacity: 0.65; font-size: 10px; font-weight: 600; text-transform: uppercase; display:block; margin-bottom:4px; font-style:normal;">Mô tả bài hát</span>` +
                                `<textarea id="edit-mota" class="retro-input" style="resize:none; height:45px; font-style:normal;">${song.mota_text || ''}</textarea>`;

      editBtn.remove();
      
      const saveBtn = document.createElement("button");
      saveBtn.innerHTML = "&#128190; Lưu lại";
      Object.assign(saveBtn.style, { cursor: "pointer", background: "#1E4233", color: "#FDFBF7", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" });
      
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.innerText = "Đang lưu...";

        const updatedData = {
          id: song.id,
          title: document.getElementById("edit-title").value,
          artist: document.getElementById("edit-artist").value,
          isrc: document.getElementById("edit-isrc").value,
genre: document.getElementById("edit-genre").value,
      mota_text: document.getElementById("edit-mota").value,
      cover: newCoverBase64 || song.cover
    };

    const success = await sendToAppsScript(updatedData);
    if (success) {
      alert("Cập nhật thành công!");
      closeInfoModal();
    } else {
      alert("Cập nhật thất bại.");
      saveBtn.disabled = false;
      saveBtn.innerHTML = "💾 Lưu lại";
    }
  };

      // Thay đổi cách sắp xếp khối đáy thành dạng Cột để nút nằm dưới mô tả
      Object.assign(bottomContainer.style, {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end", // Đẩy nút bấm về góc phải dưới cùng
        gap: "10px",
        borderTop: "1px dashed rgba(30, 66, 51, 0.15)",
        paddingTop: "10px",
        marginTop: "auto"
      });
      
      // Đảm bảo khung mô tả chiếm trọn 100% chiều ngang trước khi nút xuất hiện ở dưới
      descContainer.style.width = "100%";

      bottomContainer.appendChild(saveBtn);
    };

    // Áp dụng định dạng dạng Cột tương tự cho trạng thái xem ban đầu
    Object.assign(bottomContainer.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "10px",
      borderTop: "1px dashed rgba(30, 66, 51, 0.15)",
      paddingTop: "10px",
      marginTop: "auto"
    });
    descContainer.style.width = "100%";

    bottomContainer.appendChild(editBtn);
  }

  scrollContainer.append(title, infoGrid, bottomContainer);
  box.append(close, coverWrapper, scrollContainer);
  modal.appendChild(box);
  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    box.style.transform = "scale(1) translateY(0)";
  });
}


// 6. HÀM KẾT NỐI VÀ GỬI DỮ LIỆU SANG GOOGLE APPS SCRIPT
async function sendToAppsScript(data) {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLOparaigxJTN3gdI9uOlbQISeawmgUa2_-wSZEQi9tKQ7DRpUyfDAOdmqiXoJBY3H/exec"; // Thay link thực tế tại đây

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(data)
    });
    return true;
  } catch (error) {
    console.error("Apps Script Error:", error);
    return false;
  }
}

// HÀM ĐÓNG MODAL AN TOÀN, KHÔNG GÂY KẸT LAYOUT
function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (!modal) return;

  const box = modal.querySelector("div");
  modal.style.opacity = "0";
  if (box) box.style.transform = "scale(0.95) translateY(10px)";

  setTimeout(() => {
    modal.remove();
    document.getElementById("infoModalStyle")?.remove();
  }, 250);
}

 
// =========================================================================


// =========================================================================



/* ===== TIME ===== */
audio.ontimeupdate = () => {
  seek.value = (audio.currentTime / audio.duration) * 100 || 0;

  let m = Math.floor(audio.currentTime / 60);
  let s = Math.floor(audio.currentTime % 60);
  time.innerText = `${m}:${s < 10 ? "0"+s : s}`;
};



// 1. Thêm hàm hoán đổi ngày tháng vào trong music.js để không bao giờ bị lỗi 'not defined'
function parseVNDate(dateStr) {
  if (!dateStr) return new Date(2000, 0, 1).getTime();
  const parts = dateStr.trim().split(" ");
  if (parts.length !== 2) return new Date(2000, 0, 1).getTime();
  const [timePart, datePart] = parts;
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  const [day, month, year] = datePart.split("/").map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}


//===

function showSuggestions() {
  const box = document.getElementById("suggestBox");
  const keyword = document.getElementById("searchInput").value.toLowerCase();

  if (!keyword) {
    box.style.display = "none";
    return;
  }

let results = [];

const allSongs = window.albums.flatMap(a => a.songs || []);

// chống trùng
const seen = new Set();

allSongs.forEach(song => {

  const key = song.id || (song.title + "_" + song.artist);

  if (seen.has(key)) return;
  seen.add(key);

  const text = `
    ${song.title || ""}
    ${song.artist || ""}
  `.toLowerCase();

  if (text.includes(keyword)) {
    results.push(song);
  }
});

  box.innerHTML = "";

  results.slice(0, 8).forEach(song => {

    const div = document.createElement("div");
    div.className = "suggest-item";

    div.innerHTML = `
      <div class="suggest-title">🎵 ${song.title}</div>
      <div class="suggest-sub">👤 ${song.artist || "Unknown"}</div>
    `;

    div.onclick = () => {
      document.getElementById("searchInput").value = song.title;
      box.style.display = "none";
      searchSongs();
    };

    box.appendChild(div);
  });

  box.style.display = "block";
}

// Ẩn khi click ra ngoài
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) {
    document.getElementById("suggestBox").style.display = "none";
  }
});



function searchSongs() {
  resetUIState();

  document.querySelectorAll(".album")
    .forEach(e => e.classList.remove("active"));

  const songListElement = document.getElementById("songList");

  // ✅ FIX: lấy đúng input
  const keyword = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();

  if (!window.albums || window.albums.length === 0 || !songListElement) {
    console.warn("Dữ liệu chưa sẵn sàng!");
    return;
  }

let targetSongs = [];

const allSongs = window.albums.flatMap(a => a.songs || []);

// chống trùng bài
const seen = new Set();

allSongs.forEach((song) => {

  const key = song.id || (song.title + "_" + song.artist);

  if (seen.has(key)) return;
  seen.add(key);

  const haystack = `
    ${song.title || ""}
    ${song.artist || ""}
    ${song.genre || ""}
    ${song.isrc || ""}
    ${song.username || ""}
  `.toLowerCase();

  if (!keyword || haystack.includes(keyword)) {
    targetSongs.push(song);
  }
});

  // ===== 2. RENDER =====
  songListElement.innerHTML = "";

  targetSongs.forEach((song) => {
    const div = document.createElement("div");
    div.className = "song";
    div.dataset.id = song.id;

    div.style.cssText =
      "display:flex; justify-content:space-between; align-items:center; cursor:pointer;";

    div.innerHTML = `
      <div class="song-meta" style="flex-grow:1;">
        <div class="song-item-title">
          ${song.title || "Không rõ tên"}
        </div>
        <div class="song-item-artist">
          ${song.artist || ""} ● ${song.genre || ""} ● ${song.isrc || ""}
        </div>
      </div>

      <div class="btn-add-playlist" style="padding:8px; color:#22c55e; font-weight:bold; cursor:pointer;">
        ➕
      </div>
    `;

    // PLAY
    div.onclick = (e) => {
      if (e.target.closest(".btn-add-playlist")) return;
      play(song);
    };

    // ADD PLAYLIST
    const addBtn = div.querySelector(".btn-add-playlist");
    addBtn.onclick = (e) => {
      e.stopPropagation();

      const rect = addBtn.getBoundingClientRect();

      if (typeof showPlaylistDropdown === "function") {
        showPlaylistDropdown(rect.left - 180, rect.bottom, song);
      }
    };

    songListElement.appendChild(div);
  });
}


async function initApp() {
  console.log("🚀 INIT APP START");

  // Giữ nguyên logic hiển thị mặc định của bạn
  const albumList = document.getElementById("albumList");
  const publicPlaylists = document.getElementById("publicPlaylists");

  if (albumList) albumList.style.display = "flex";
  if (publicPlaylists) publicPlaylists.style.display = "block";

  // 🔥 Tải dữ liệu công khai ngay tại đây để dù là Desktop hay Mobile đều có sẵn dữ liệu trong bộ nhớ
  if (typeof loadPublicPlaylists === "function") {
    await loadPublicPlaylists();
  }

  loadMobileGuestPlaylists();
  checkUserSession();

  if (typeof bindPublicPlaylistButton === "function") {
    bindPublicPlaylistButton();
  }

  autoOpenFirstAlbum();
}
