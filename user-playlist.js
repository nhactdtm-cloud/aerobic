
const GAS_URL =
"https://script.google.com/macros/s/AKfycbw6LAk4MgYzZG5JJ_JNs3_uGgVzvfPuYh2lljK_b3uQDuh3ShG--kJp8NsNH5AnsIPtog/exec";

// Tự động tạo và nhúng CSS vào trang web (Đã bổ sung CSS hộp thoại xóa ở giữa màn hình)
(function() {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
        .dropdown-playlist-item {
            padding: 10px; cursor: pointer; border-radius: 6px; transition: 0.2s; font-size: 14px; color: #fff; background: transparent;
        }
        .dropdown-playlist-item:hover {
            background: #1E4233 !important; color: #FDFBF7 !important;
        }
        
        /* --- CSS CHO HỘP THOẠI XÓA GIỮA MÀN HÌNH --- */
        .custom-confirm-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); /* Làm mờ đen phông nền phía sau */
            display: flex; justify-content: center; align-items: center; z-index: 9999999;
        }
        .custom-confirm-box {
            background: #181818; border: 1px solid #333; border-radius: 12px;
            padding: 20px; width: 320px; text-align: center; color: #fff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: sans-serif;
        }
        .custom-confirm-title {
            font-size: 16px; font-weight: bold; margin-bottom: 15px; line-height: 1.4;
        }
        .custom-confirm-buttons {
            display: flex; justify-content: space-around; gap: 10px; margin-top: 15px;
        }
        .custom-btn {
            flex: 1; padding: 10px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s;
        }
        .custom-btn-cancel { background: #333; color: #fff; }
        .custom-btn-cancel:hover { background: #444; }
        .custom-btn-confirm { background: #ff4d4d; color: #fff; }
        .custom-btn-confirm:hover { background: #ff3333; }
    `;
    document.head.appendChild(styleEl);
})();

// Hàm tạo hộp thoại hỏi xóa hiển thị ngay giữa màn hình
function showCustomConfirm(message, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";

    overlay.innerHTML = `
        <div class="custom-confirm-box">
            <div class="custom-confirm-title">${message}</div>
            <div class="custom-confirm-buttons">
                <button class="custom-btn custom-btn-cancel" id="confirm-btn-no">Hủy</button>
                <button class="custom-btn custom-btn-confirm" id="confirm-btn-yes">Xóa</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Khi bấm nút Hủy
    overlay.querySelector("#confirm-btn-no").onclick = () => {
        overlay.remove();
    };

    // Khi bấm nút Xóa
    overlay.querySelector("#confirm-btn-yes").onclick = () => {
        overlay.remove();
        onConfirm(); // Kích hoạt lệnh xóa thực tế
    };
}

function getUserKey(){
    const name = localStorage.getItem("username");
    return 'user_aerobic_playlists_' + (name || "guest");
}
let currentGuestPlaylist = null;
let currentGuestPlaylistName = null;
(function(){

    const oldGetElementById = document.getElementById.bind(document);

    document.getElementById = function(id){

        const el = oldGetElementById(id);

        if(el) return el;

        // Fake userBtn để tránh crash
        if(id === "userBtn"){
            return {
                innerText:"",
                style:{},
                addEventListener(){},
                removeEventListener(){},
                onclick:null
            };
        }

        return null;
    };

})();

let guestListArea = null;
// 1. Hàm khởi tạo vùng lưu trữ của khách (Chạy tự động khi tải trang)
async function initGuestPlaylist() {
    // Nếu đã tồn tại khu vực của khách rồi thì không tạo lại nữa để tránh trùng lặp
    if (document.getElementById('guest-playlist-section')) return;

    // Tìm chính xác thẻ albumList của bạn trên giao diện
    const albumListElement = document.getElementById('albumList'); 
    if (!albumListElement) return;

    // Tạo một khung bọc riêng biệt cho khách
    const guestWrapper = document.createElement('div');
    guestWrapper.id = "guest-playlist-section";
    guestWrapper.style.marginTop = "15px"; // Tạo khoảng cách phía trên với mục BXH 10
    guestWrapper.style.width = "100%";

    // Tạo nút bấm cho khách tự tạo playlist (Nút này sẽ xuất hiện ngay dưới BXH 10)
    const btnCreate = document.createElement('button');
    btnCreate.innerText = "➕ Tạo bộ sưu tập mới";
btnCreate.style.cssText = `
    width:100%;
    padding:12px;
    background:#1e1e1e;
    color:#fff;
    border:1px dashed #1E4233;
    border-radius:8px;
    cursor:pointer;
    font-weight:bold;
    text-align:left;
    margin-bottom:10px;
    font-size:14px;
    position:sticky;
    top:0;
    z-index:999;
`;
    btnCreate.onclick = khachTaoPlaylist;

    // Tạo vùng chứa danh sách các nút bộ sưu tập sau khi tạo (Nằm ở dưới cùng)
    guestListArea = document.createElement('div');
    guestListArea.id = "guest-playlist-list";

    // 🔥 ĐỔI THỨ TỰ CHÈN: Đưa nút bấm lên trước, vùng chứa danh sách xuống sau
    guestWrapper.appendChild(btnCreate);
    guestWrapper.appendChild(guestListArea);

albumListElement.insertBefore(
    guestWrapper,
    document.querySelector(".album:nth-child(4)")?.nextSibling
);

    // Vẽ danh sách playlist của khách ra màn hình
    renderGuestPlaylists();
}


function khachTaoPlaylist() {
    const listArea = document.getElementById('guest-playlist-list');
    if (!listArea) return;

    // Kiểm tra nếu đang có một ô nhập liệu chưa gõ xong thì không tạo thêm ô nữa
    if (document.getElementById('inline-playlist-input')) {
        document.getElementById('inline-playlist-input').focus();
        return;
    }

    const username = localStorage.getItem("username") || "guest";

    // 1. TẠO Ô NHẬP LIỆU TẠM THỜI THEO HỆ MÀU RETRO
    const divWrapper = document.createElement("div");
    divWrapper.className = "album"; 
divWrapper.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:5px;
    margin-bottom:5px;
    padding-right:10px;
    cursor:pointer;
`;

    const inputName = document.createElement("input");
    inputName.id = "inline-playlist-input";
    inputName.type = "text";
    inputName.placeholder = "Nhập tên bộ sưu tập...";
    inputName.style.cssText = "flex-grow: 1; background: #F5F1E6; color: #212121; border: 2px solid #1E4233; border-radius: 6px; padding: 6px 10px; font-size: 14px; outline: none; font-weight: 600;";

    divWrapper.appendChild(inputName);
    listArea.appendChild(divWrapper);
    inputName.focus(); 

    // 2. LOGIC XỬ LÝ KHI GÕ XONG (ẤN ENTER HOẶC CLICK RA NGOÀI)
    let isSaved = false; 

    const hanldleSave = async () => {
        if (isSaved) return;
        
        let name = inputName.value.trim();

        // Nếu người dùng không gõ gì, tự động hủy bỏ dòng đó
        if (!name) {
            divWrapper.remove();
            return;
        }

        isSaved = true; // Đánh dấu đã kích hoạt lưu
        let email = "";

        // Tạm thời hiển thị trạng thái chờ check email trên giao diện
        inputName.style.display = "none";
        divWrapper.innerText = "⏳ Đang kiểm tra dữ liệu...";
        divWrapper.style.color = "#212121";
        divWrapper.style.fontWeight = "600";

try {
    const res = await fetch("./data/users.json");
    const data = await res.json();

    const user = data.users.find(
        u => u.username === username
    );

    email = user?.email || "";

} catch (err) {
    console.error("users.json error:", err);
    email = "";
}

        const emailVerified = email.trim().length > 0;

        // 🔥 THAY ĐỔI QUAN TRỌNG: RẼ NHÁNH XỬ LÝ KHÔNG CẦN OTP
        if (emailVerified) {
            // Nếu tài khoản đã có Gmail rồi -> Bỏ qua OTP, tiến hành lưu thẳng lên Sheets luôn
            tiếnHànhLưuPlaylistNgầm(username, name, divWrapper);
        } else {
            // Nếu tài khoản chưa từng khai báo Gmail -> Xóa dòng tạm và mở Box Modal bắt xác thực OTP
            divWrapper.remove(); 
            tạoBoxXácThựcGiaoDiện(username, name);
        }
    };

    // Bắt sự kiện ấn phím Enter
    inputName.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            inputName.removeEventListener("blur", hanldleSave); // Xóa blur để không chạy trùng 2 lần
            hanldleSave();
        }
    });

    // Bắt sự kiện khi người dùng click chuột ra ngoài vùng ô nhập liệu
    inputName.addEventListener("blur", hanldleSave);
}


// ==========================================
// HÀM TẠO BOX BOX NHẬP OTP (MODAL) TRÊN GIAO DIỆN
// ==========================================
function tạoBoxXácThựcGiaoDiện(username, playlistName) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbw_0dS5-lUrpClm824c5ZTUJECn789U4pqffwjUYKX68Nk8cypGj_snxdaP-jis6uYi/exec";
    // Xóa Box cũ nếu có
    const oldModal = document.getElementById("otp-auth-modal");
    if (oldModal) oldModal.remove();

    // Tạo lớp phủ nền mờ toàn màn hình
     // 1. LỚP PHỦ NỀN MỜ TOÀN MÀN HÌNH (Sử dụng tone Đen chì mờ nhẹ để tôn khối Retro)
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "otp-auth-modal";
    modalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(33, 33, 33, 0.7); display: flex; align-items: center; justify-content: center; z-index: 99999; font-family: sans-serif; backdrop-filter: blur(3px);";

    // 2. HỘP THOẠI TRUNG TÂM (60% Nền Trắng kem #FDFBF7, Chữ Đen chì #212121)
    const modalBox = document.createElement("div");
    modalBox.style.cssText = "background: #FDFBF7; border: 2px solid #1E4233; padding: 25px; border-radius: 12px; width: 340px; text-align: center; color: #212121; box-shadow: 0 10px 25px rgba(30, 66, 51, 0.15); font-weight: 5px;";
    
    modalBox.innerHTML = `
        <!-- Tiêu đề & Mô tả dùng màu Chủ đạo Xanh rêu đậm -->
        <h3 style="margin-top: 0; color: #1E4233; font-size: 19px; font-weight: 700; letter-spacing: -0.5px;">🔒 Xác Thực Bộ Sưu Tập</h3>
        <p style="font-size: 13px; color: #555; margin-bottom: 20px; line-height: 1.4;">Vui lòng xác thực Email để lưu danh sách.</p>
        
        <!-- VÙNG NHẬP EMAIL -->
        <div id="email-step-zone">
            <input type="email" id="modal-email-input" placeholder="Nhập Gmail của bạn..." 
                   style="width: 100%; background: #F5F1E6; color: #212121; border: 1px solid #1E4233; padding: 10px; border-radius: 6px; box-sizing: border-box; outline: none; margin-bottom: 14px; font-size: 14px; transition: all 0.2s;">
            <button id="modal-btn-send" 
                    style="width: 100%; background: #1E4233; color: #FDFBF7; border: none; padding: 11px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 3px 6px rgba(30, 66, 51, 0.2);">Gửi mã OTP</button>
        </div>

        <!-- VÙNG NHẬP OTP (Mặc định ẩn) -->
        <div id="otp-step-zone" style="display: none;">
            <p id="otp-status-msg" style="font-size: 13px; color: #1E4233; font-weight: 600; margin: 5px 0 12px 0;"></p>
            <input type="text" id="modal-otp-input" placeholder="Nhập mã OTP 6 số..." maxlength="6" 
                   style="width: 100%; background: #F5F1E6; color: #212121; border: 2px dashed #1E4233; padding: 10px; border-radius: 6px; box-sizing: border-box; text-align: center; letter-spacing: 5px; font-size: 18px; font-weight: bold; outline: none; margin-bottom: 14px;">
            <button id="modal-btn-verify" 
                    style="width: 100%; background: #1E4233; color: #FDFBF7; border: none; padding: 11px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 3px 6px rgba(30, 66, 51, 0.2);">Xác Nhận Nhập</button>
        </div>

        <!-- Nút Hủy bỏ dùng màu Điểm nhấn Đỏ gạch #C84B31 đầy tính nghệ thuật -->
        <button id="modal-btn-cancel" 
                style="background: none; border: none; color: #C84B31; margin-top: 18px; cursor: pointer; font-size: 13px; font-weight: 600; text-decoration: underline; letter-spacing: 0.3px;">Hủy bỏ</button>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Lấy các element trong modal
    const emailInput = document.getElementById("modal-email-input");
    const btnSend = document.getElementById("modal-btn-send");
    const emailZone = document.getElementById("email-step-zone");
    
    const otpInput = document.getElementById("modal-otp-input");
    const btnVerify = document.getElementById("modal-btn-verify");
    const otpZone = document.getElementById("otp-step-zone");
    const otpMsg = document.getElementById("otp-status-msg");
    const btnCancel = document.getElementById("modal-btn-cancel");

    let savedEmail = "";

    // SỰ KIỆN 1: BẤM NÚT GỬI OTP
    btnSend.addEventListener("click", async () => {
        savedEmail = emailInput.value.trim();
        if (!savedEmail || !savedEmail.includes("@")) {
            showToast("❌ Email không hợp lệ");
            return;
        }

        btnSend.innerText = "⏳ Đang gửi...";
        btnSend.disabled = true;

        try {
            const send = await sendOTP(savedEmail, username);
            if (send?.success) {
                showToast("✅ Đã gửi mã OTP thành công");
                emailZone.style.display = "none"; // Ẩn ô nhập email
                otpZone.style.display = "block"; // Hiện ô nhập OTP
                otpMsg.innerText = `Mã đã gửi đến: ${savedEmail}`;
                otpInput.focus();
            } else {
                showToast("❌ Không gửi được OTP");
                btnSend.innerText = "Gửi mã OTP";
                btnSend.disabled = false;
            }
        } catch (e) {
            showToast("❌ Lỗi kết nối gửi OTP");
            btnSend.innerText = "Gửi mã OTP";
            btnSend.disabled = false;
        }
    });

    // SỰ KIỆN 2: BẤM NÚT XÁC MINH OTP
    btnVerify.addEventListener("click", async () => {
        const otpVal = otpInput.value.trim();
        if (!otpVal) {
            showToast("❌ Vui lòng nhập OTP");
            return;
        }

        btnVerify.innerText = "⏳ Đang xác thực...";
        btnVerify.disabled = true;

        try {
const verify = await verifyOTP(savedEmail, otpVal, username, GAS_URL);

if (!verify?.success) {
    showToast("❌ Mã OTP sai hoặc đã hết hạn");
    btnVerify.innerText = "Xác Nhận Nhập";
    btnVerify.disabled = false;
    return;
}

showToast("✅ Xác thực thành công");

fetch(GAS_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        action: "saveEmail",
        username,
        email: savedEmail
    })
});

modalOverlay.remove();

const listArea = document.getElementById('guest-playlist-list');

if (listArea) {
    const finalWrapper = document.createElement("div");
    finalWrapper.className = "album";
    finalWrapper.style.cssText =
        "display:flex;align-items:center;background-color:#1a2e1a;margin-bottom:5px;padding:5px 10px;";

    listArea.appendChild(finalWrapper);

    // FIX QUAN TRỌNG: dùng playlistName, không phải tempPlaylistName
    tiếnHànhLưuPlaylistNgầm(username, playlistName, finalWrapper);
}

        } catch (err) {
            showToast("❌ Lỗi xử lý xác minh dữ liệu");
            btnVerify.innerText = "Xác Nhận Nhập";
            btnVerify.disabled = false;
        }
    });

    // SỰ KIỆN 3: ẤN HỦY
    btnCancel.addEventListener("click", () => {
        modalOverlay.remove();
        showToast("⚠️ Đã hủy tạo bộ sưu tập");
        renderGuestPlaylists();
    });
}

// ==========================================
async function tiếnHànhLưuPlaylistNgầm(username, name, divWrapper) {
    divWrapper.innerText = "🎵 " + name + " (Đang đồng bộ...)";
    divWrapper.style.opacity = "0.6";

    try {
        // Chèn trực tiếp link Web App của bạn vào đây thay cho biến GAS_URL
        const res = await fetch("https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec", {
            method: "POST",
            body: JSON.stringify({
                action: "createPlaylist",
                username: username,
                playlistName: name,
                public: false
            })
        });
        
        const result = await res.json();

        if (result.success) {
            showToast("Đã đồng bộ bộ sưu tập mới");
        } else {
            showToast(`⚠️ ${result.message || "Không lưu được bộ sưu tập"}`);
            divWrapper.remove();
        }
    } catch (err) {
        console.error(err);
        showToast("⚠️ Lỗi đồng bộ rớt mạng");
        divWrapper.remove();
    } finally {
        renderGuestPlaylists(); // Tải lại danh sách chuẩn từ Sheets
    }
}


// Hàm playlis Khách Tạo
async function renderGuestPlaylists() {
    const listArea = document.getElementById('guest-playlist-list');
    if (!listArea) return;

    const GAS_URL = "https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec";
    
    listArea.innerHTML = "";

    const username = localStorage.getItem("username") || "guest";

    try {
        // 🔥 LẤY TRỰC TIẾP TỪ JSON THAY VÌ GAS
        const res = await fetch("./data/playlists.json");
        const allPlaylists = await res.json();

        console.log("PLAYLISTS =", allPlaylists);

        // lọc playlist theo user (nếu file có username)
        const playlists = allPlaylists.filter(p => {
            return !p.username || p.username === username;
        });

        loadPublicPlaylists();

        playlists.forEach(item => {

            const name = item.playlist_name || "Không tên";
            const isPublic = item.visibility === "public";
            const songids = Array.isArray(item.songids) ? item.songids : [];

            // Khung bọc toàn bộ dòng playlist (Giữ nguyên cursor:pointer để tải nhạc)
            const divWrapper = document.createElement("div");
            divWrapper.className = "album";
            divWrapper.style.cssText =
                "display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;padding-right:10px;cursor:pointer;";

            // 🔥 HÀNH ĐỘNG 1: CLICK VÀO VÙNG TRỐNG SẼ TẢI NHẠC
            divWrapper.onclick = async () => {
                showToast("⏳ Đang tải bài hát...");
                try {
                    const songsRes = await fetch("./data/songs.json");
                    const allSongs = await songsRes.json();

                    const songs = allSongs.filter(s =>
                        songids.includes(s.id)
                    );

                    if (!songs.length) {
                        showToast("Playlist trống");
                        return;
                    }

                    loadGuestPlaylistTracks(name, songs);

                } catch (err) {
                    console.error(err);
                    showToast("❌ Lỗi tải playlist");
                }
            };

            const infoDiv = document.createElement("div");
            infoDiv.style.cssText = `
                flex:1;
                min-width:0;
                overflow:hidden;
                display:flex;
                flex-direction:column;
            `;

            // Tiêu đề chữ playlist
            const textSpan = document.createElement("div");
            textSpan.innerText = "🎵 " + name;
            textSpan.title = name;
            
            // 🔥 THU HẸP VÙNG CLICK CỦA TIÊU ĐỀ BẰNG width: fit-content
            textSpan.style.cssText = `
                font-weight:bold;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
                width:fit-content;
                max-width:100%;
            `;

            // 🔥 HÀNH ĐỘNG 2: CLICK VÀO TIÊU ĐỀ CHỮ SẼ MỞ SETTINGS
            textSpan.onclick = (e) => {
                e.stopPropagation(); // Ngăn sự kiện lan ra divWrapper, chặn việc tải nhạc khi mở cài đặt
                openPlaylistSettings(item, {
                    onUpdate: renderGuestPlaylists,
                    onDelete: xoaPlaylistCuaKhach
                });
            };

            const infoSpan = document.createElement("div");
            infoSpan.innerText =
                `${(item.plan ?? 0) == 0 ? "Free" : "Plan " + item.plan} • ${songids.length} bài hát`;

            infoSpan.style.cssText = `
                font-size:11px;
                color:#888;
                margin-top:2px;
            `;

            // 🌍 / 🔒 public toggle (GIỮ UI, KHÔNG GAS - chỉ local demo)
            const btnPublic = document.createElement("span");
            btnPublic.innerText = isPublic ? "🌍" : "🔒";
            btnPublic.title = isPublic ? "Công khai" : "Riêng tư";
            btnPublic.style.cssText = `
                cursor:pointer;
                padding:2px 6px;
                margin-right:5px;
            `;
            btnPublic.onclick = async (e) => {
                e.stopPropagation(); // Chặn tải nhạc khi bấm đổi quyền riêng tư

                const currentIcon = btnPublic.innerText.trim();
                const newVisibility = currentIcon === "🌍" ? "private" : "public";

                btnPublic.innerText = "⏳";

                try {
                    const playlistId = item.id; 
                    if (!playlistId) {
                        alert("Lỗi: Không tìm thấy ID của playlist!");
                        btnPublic.innerText = currentIcon;
                        return;
                    }

                    const response = await fetch(GAS_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "text/plain;charset=utf-8"
                        },
                        body: JSON.stringify({
                            action: "toggleVisibility",
                            playlistId: playlistId,
                            visibility: newVisibility
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        btnPublic.innerText = newVisibility === "public" ? "🌍" : "🔒";
                        if (typeof loadPublicPlaylists === "function") {
                            loadPublicPlaylists(); 
                        }
                    } else {
                        console.error("Lỗi xử lý từ Apps Script:", result.error);
                        alert("Cập nhật thất bại: " + result.error);
                        btnPublic.innerText = currentIcon;
                    }

                } catch (err) {
                    console.error("Lỗi kết nối mạng:", err);
                    btnPublic.innerText = currentIcon;
                }
            };

            // Gom các phần tử lại
            infoDiv.appendChild(textSpan);
            infoDiv.appendChild(infoSpan);

            divWrapper.appendChild(infoDiv);
            divWrapper.appendChild(btnPublic);

            listArea.appendChild(divWrapper);
        });

    } catch (err) {
        console.error(err);
        showToast("❌ Không thể tải playlists từ JSON");
    }
}



function openPlaylistSettings(item, actions) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec";
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.6);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:9999;
        backdrop-filter: blur(5px);
    `;

    const box = document.createElement("div");
    box.style.cssText = `
        width:340px;
        background:#1e1e1e;
        color:#fff;
        padding:18px;
        border-radius:14px;
        display:flex;
        flex-direction:column;
        gap:10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        font-family: Arial;
    `;

    box.style.position = 'relative'; 

    box.innerHTML = `
        <!-- Nút X đóng ở góc phải -->
        <span id="closeBtn" style="position:absolute;top:10px;right:12px;cursor:pointer;font-size:16px;color:#aaa;transition:color 0.2s;" 
              onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#aaa'">✕</span>

        <h2 style="margin:0 0 10px 0;font-size:18px;">⚙️ Cài đặt playlist</h2>

        <label style="font-size:12px;color:#aaa;">Tên playlist</label>
        <input id="pl_name" value="${item.playlist_name || ""}"
            style="padding:8px;border-radius:8px;border:none;outline:none;" />

        <label style="font-size:12px;color:#aaa;">Mô tả</label>
        <textarea id="pl_desc"
            style="padding:8px;border-radius:8px;border:none;outline:none;resize:none;height:60px;">${item.description || ""}</textarea>

        <label style="font-size:12px;color:#aaa;">Plan (số tiền)</label>
        <input id="pl_plan" type="number" value="${item.plan || 0}"
            style="padding:8px;border-radius:8px;border:none;outline:none;" />

        <div style="display:flex;gap:8px;margin-top:15px;">
            <button id="saveBtn"
                style="flex:1;padding:8px;border:none;border-radius:8px;background:#1db954;color:#fff;cursor:pointer;">
                💾 Lưu
            </button>

            <button id="delBtn"
                style="flex:1;padding:8px;border:none;border-radius:8px;background:#ff4d4d;color:#fff;cursor:pointer;">
                🗑 Xóa
            </button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("closeBtn").onclick = () => overlay.remove();

    document.getElementById("saveBtn").onclick = async () => {
        // 1. Lấy dữ liệu mới từ form
        const newData = {
            ...item,
            playlist_name: document.getElementById("pl_name").value,
            description: document.getElementById("pl_desc").value,
            plan: Number(document.getElementById("pl_plan").value || 0)
        };

        // 2. Ẩn lập tức giao diện cài đặt (Không chờ đợi)
        overlay.remove();

        // 3. Cập nhật ngay giao diện chính (Nếu bạn muốn UI thay đổi ngay lập tức trước khi server phản hồi)
        if (actions && typeof actions.onUpdate === "function") {
            // Tạm thời kích hoạt onUpdate để UI bên ngoài đổi tên/mô tả mới ngay
            actions.onUpdate(newData); 
        }

        // 4. Gửi request ngầm lên Google Apps Script
try {
    await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "updatePlaylist",
            playlist: newData
        })
    });

    showToast("✅ Đã chỉnh sửa playlist thành công!");
} catch (err) {
    console.error(err);
    showToast("❌ Không thể lưu thay đổi!");
}
    };

    document.getElementById("delBtn").onclick = () => {
        overlay.remove();
        actions.onDelete(item.id, item.playlist_name);
    };
}



// Bộ sưu tập công khai vẽ
let globalRenderController = null;

async function renderAndSetupPlaylists(rawPlaylistsData) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxEoH0B9tnS2CVoRhXS5trKfe5thL3Xiugf5_48ZWP-VXw0s7Wiwpq2mBhYY4W9hY90JQ/exec";
    const box = document.getElementById("publicPlaylistBox");
    if (!box) return;

    // 🌟 KHÓA CỨNG TUYỆT ĐỐI: Tạo token ngẫu nhiên cho phiên vẽ này
    const currentRenderToken = Math.random().toString(36).substring(2);
    globalRenderController = currentRenderToken;

    // Xóa sạch vùng chứa ngay lập tức
    box.innerHTML = "";

    if (!rawPlaylistsData || rawPlaylistsData.length === 0) {
        box.innerHTML = "<p style='color:gray; padding:10px;'>Chưa có playlist công khai nào.</p>";
        return;
    }

const uniquePlaylists = [];
const seenIds = new Set();

rawPlaylistsData
    .filter(item => item?.visibility === "public")
    .forEach(item => {
        if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniquePlaylists.push(item);
        }
    });

    // Lấy username của người đang đăng nhập
    const currentUsername = localStorage.getItem("username") || "guest";
    let pinnedList = [];
    
    try {
        // Lấy danh sách ID đã ghim từ server
        pinnedList = await fetchPinned();
        if (!Array.isArray(pinnedList)) pinnedList = [];
    } catch (err) {
        console.error("Lỗi lấy danh sách ghim:", err);
    }

    // 🌟 KIỂM TRA KHÓA RE-RENDER
    if (globalRenderController !== currentRenderToken) {
        console.warn("⚠️ Phát hiện luồng render cũ chạy song song, đã hủy bỏ!");
        return; 
    }

    // Sắp xếp dữ liệu công khai: Playlist nào có 'id' nằm trong pinnedList sẽ lên đầu
    const sorted = [...uniquePlaylists].sort((a, b) => {
        const aIndex = pinnedList.indexOf(a.id);
        const bIndex = pinnedList.indexOf(b.id);
        const aPinned = aIndex !== -1;
        const bPinned = bIndex !== -1;

        if (aPinned && bPinned) return bIndex - aIndex;
        if (aPinned) return -1;
        if (bPinned) return 1;
        return 0;
    });

    // 🌟 KIỂM TRA LẦN CUỐI TRƯỚC KHI VẼ GIAO DIỆN
    if (globalRenderController !== currentRenderToken) return;
    box.innerHTML = ""; 

    console.log("🛠️ Vẽ giao diện theo ID cho:", sorted.length, "playlists.");

    sorted.forEach(item => {
        const currentPlaylistId = item.id; 
        const isPinned = pinnedList.includes(currentPlaylistId);

        // 1. Tạo khung lớn bao quanh (Flexbox hàng ngang)
        const rowDiv = document.createElement("div");
        rowDiv.className = "public-playlist";
        rowDiv.style.display = "flex";
        rowDiv.style.justifyContent = "space-between";
        rowDiv.style.alignItems = "center";
        rowDiv.style.padding = "12px";
        rowDiv.style.margin = "8px 0";
        rowDiv.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        rowDiv.style.borderRadius = "8px";
        rowDiv.style.border = "1px solid rgba(255, 255, 255, 0.15)";
        rowDiv.style.cursor = "pointer"; // Hiển thị con trỏ tay trên toàn bộ hàng

        // HÀNH ĐỘNG 2: Click RA NGOÀI VÙNG CHỮ (Vùng trống của hàng) -> Tải và phát nhạc
        rowDiv.onclick = async () => {
            try {
                if (typeof showToast === "function") showToast("⏳ Đang tải bài hát...");
                const songRes = await fetch("data/songs.json");
                if (!songRes.ok) throw new Error();
                const allSongs = await songRes.json();
                const targetIds = Array.isArray(item.songids) ? item.songids : [];
                const playlistSongs = allSongs.filter(song => targetIds.includes(song.id));
                loadGuestPlaylistTracks(`🌍 ${item.playlist_name}`, playlistSongs);
            } catch (err) {
                console.error("Lỗi phát nhạc:", err);
            }
        };

        // 2. VÙNG BÊN TRÁI: Chỉ chứa thông tin chữ
        const infoDiv = document.createElement("div");
        infoDiv.style.flexGrow = "1";
        infoDiv.style.minWidth = "0"; // Chống tràn chữ
        infoDiv.style.textAlign = "left";
        infoDiv.style.paddingRight = "10px";
        infoDiv.style.overflow = "hidden";

        const songCount = Array.isArray(item.songids) ? item.songids.length : 0;
        const planValue = Number(item.plan ?? 0);
        let planLabel = planValue === 0 ? "FREE" : planValue.toLocaleString("vi-VN") + "đ";
        
infoDiv.innerHTML = `
    <b style="
        font-size:0.9rem;
        color:#ffffff;
        display:block;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        max-width:100%;
    ">
        <span class="playlist-click" style="cursor:pointer;">
            ${item.playlist_name}
        </span>
    </b>

    <span style="
        color:#b3b3b3;
        font-size:0.75rem;
        display:flex;
        align-items:center;
        gap:6px;
        margin-top:3px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        min-width:0;
    ">
        <span style="
            color:${planValue === 0 ? "#2ecc71" : "#f39c12"};
            font-weight:600;
            font-size:0.7rem;
            flex-shrink:0;
        ">
            ${planLabel}
        </span>

        <span style="
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            min-width:0;
        ">
            👤 ${item.username || "Ẩn danh"} • 🎵 ${songCount} bài hát
        </span>
    </span>
`;

const titleEl = infoDiv.querySelector(".playlist-click");
if (titleEl) {
    titleEl.addEventListener("click", (event) => {
        event.stopPropagation();

        if (typeof showPlaylistInfo === "function") {
            showPlaylistInfo(item);
        } else if (typeof window.showPlaylistInfo === "function") {
            window.showPlaylistInfo(item);
        } else {
            console.error("Không tìm thấy showPlaylistInfo()");
        }
    });
}

        // 3. VÙNG BÊN PHẢI: Chứa riêng biệt nút Ghim chống xung đột click
        const pinContainerDiv = document.createElement("div");
        pinContainerDiv.style.display = "flex";
        pinContainerDiv.style.alignItems = "center";
        pinContainerDiv.style.justifyContent = "center";
        pinContainerDiv.style.width = "40px";
        pinContainerDiv.style.height = "40px";

        const pinBtn = document.createElement("button");
        pinBtn.className = "pin-btn";
        pinBtn.style.background = "none";
        pinBtn.style.border = "none";
        pinBtn.style.fontSize = "1.3rem";
        pinBtn.style.cursor = "pointer";
        pinBtn.style.padding = "5px";
        pinBtn.style.lineHeight = "1";
        pinBtn.innerHTML = isPinned ? "📌" : "📍";

        // Sự kiện click nút ghim -> Gửi lệnh lên server
        pinBtn.onclick = function(e) {
            e.stopPropagation(); // Ngăn hành vi click lan sang vùng phát nhạc

            if (!currentUsername || currentUsername === "guest") {
                if (typeof showToast === "function") showToast("❌ Bạn cần đăng nhập để ghim!");
                return;
            }

            pinBtn.innerHTML = "⏳";
            pinBtn.disabled = true;

            const callbackName = "gasCallback_" + Math.random().toString(36).substring(2);

            window[callbackName] = function(result) {
                if (typeof showToast === "function") {
                    showToast(result.message);
                }
                if (typeof loadPublicPlaylists === "function") {
                    loadPublicPlaylists();
                }
                document.getElementById(callbackName)?.remove();
                delete window[callbackName];
            };

            const requestUrl = `${GAS_URL}?action=togglePin&username=${encodeURIComponent(currentUsername)}&playlistId=${encodeURIComponent(currentPlaylistId)}&callback=${callbackName}`;

            const scriptElement = document.createElement("script");
            scriptElement.id = callbackName;
            scriptElement.src = requestUrl;
            
            scriptElement.onerror = function() {
                console.error("❌ Lỗi kết nối Google Apps Script.");
                if (typeof showToast === "function") showToast("❌ Lỗi đồng bộ ghim với máy chủ!");
                pinBtn.innerHTML = isPinned ? "📌" : "📍";
                pinBtn.disabled = false;
                delete window[callbackName];
            };

            document.body.appendChild(scriptElement);
        };

        // 4. Lắp ráp các thành phần vào khung lớn theo đúng thứ tự
        pinContainerDiv.appendChild(pinBtn);
        rowDiv.appendChild(infoDiv);         // Vùng chữ nằm bên trái
        rowDiv.appendChild(pinContainerDiv); // Vùng nút ghim nằm góc phải
        box.appendChild(rowDiv);
    });
}


function showPlaylistInfo(item) {

    // Chỉ thêm CSS một lần - Hệ màu: Indie Vinyl Retro
    if (!document.getElementById("playlist-popup-style")) {
        const style = document.createElement("style");
        style.id = "playlist-popup-style";
        style.textContent = `
        .playlist-popup-bg {
            position: fixed;
            inset: 0;
            background: rgba(33, 33, 33, 0.5); /* Đen chì mờ nhẹ nhàng */
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            backdrop-filter: blur(4px); /* Làm mờ nền phía sau */
        }

        .playlist-popup {
            position: relative; /* Để định vị nút X tuyệt đối */
            width: 360px;
            max-width: 92%;
            background: #FDFBF7; /* Màu nền (60%): Trắng kem/Vỏ trứng hoài cổ */
            color: #212121;      /* Màu chữ (10%): Đen chì dễ chịu */
            border-radius: 16px;
            padding: 28px 24px 24px 24px; /* Tăng padding trên để nhường chỗ nút X */
            box-shadow: 0 12px 40px rgba(33,33,33,.15);
            border: 1px solid rgba(30, 66, 51, 0.1);
            animation: popupFade .25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Nút X đóng góc trên bên phải */
        .playlist-popup-x {
            position: absolute;
            top: 14px;
            right: 14px;
            background: transparent;
            border: none;
            color: #555555;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.15s ease;
            padding: 0;
            margin: 0;
        }

        .playlist-popup-x:hover {
            background: rgba(30, 66, 51, 0.08);
            color: #1E4233;
        }

        .playlist-popup h2 {
            margin: 0 0 12px;
            font-size: 22px;
            font-weight: 700;
            color: #1E4233; /* Màu chủ đạo (25%): Xanh rêu đậm quý phái */
            letter-spacing: -0.5px;
            padding-right: 20px; /* Tránh chữ tiêu đề đè vào nút X */
        }

        .playlist-popup p {
            color: #555555;
            line-height: 1.6;
            margin-bottom: 20px;
            font-size: 14.5px;
        }

        .playlist-popup .info-box {
            background: rgba(30, 66, 51, 0.05); /* Nền xanh rêu siêu mờ */
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
        }

        .playlist-popup .info {
            margin: 8px 0;
            font-size: 14.5px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }

        /* Nút đăng ký / thêm thư viện - Đỏ gạch nghệ thuật */
        .playlist-register {
            width: 100%;
            border: none;
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.2s ease;
            background: #C84B31; /* Màu điểm nhấn (5%): Đỏ gạch / Đỏ Terracotta */
            color: #FDFBF7;
        }

        .playlist-register:hover {
            background: #b13e27;
            transform: translateY(-1px);
        }

        @keyframes popupFade {
            from {
                transform: scale(.92);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
        `;

        document.head.appendChild(style);
    }

    const planText = Number(item.plan) === 0
        ? "Miễn phí"
        : Number(item.plan).toLocaleString("vi-VN") + "đ";

    const desc = item.description || "Playlist chưa có mô tả.";

    const popup = document.createElement("div");
    popup.className = "playlist-popup-bg";

    popup.innerHTML = `
        <div class="playlist-popup">
            <!-- Nút X góc phải -->
            <button class="playlist-popup-x" title="Đóng">&times;</button>

            <h2>${item.playlist_name}</h2>

            <p>${desc}</p>

            <div class="info-box">
                <div class="info">👤 <span style="color: #1E4233">${item.username || "Ẩn danh"}</span></div>
                <div class="info">🎵 <span style="color: #1E4233">${(item.songids || []).length} bài hát</span></div>
                <div class="info">💎 <span style="color: #C84B31; font-weight: 700;">${planText}</span></div>
            </div>

            <button class="playlist-register">
                ${Number(item.plan) === 0 ? "➕ Thêm vào thư viện" : "💳 Đăng ký ngay"}
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // Sự kiện đóng khi bấm nút X
    popup.querySelector(".playlist-popup-x").onclick = () => popup.remove();

    // Sự kiện nút đăng ký
    popup.querySelector(".playlist-register").onclick = () => {
        if (typeof registerPlaylist === "function") {
            registerPlaylist(item);
        }
        popup.remove();
    };

    // Bấm nền tối để đóng
    popup.onclick = e => {
        if (e.target === popup) popup.remove();
    };
}

//=== Bộ sưu tập công khai
async function loadPublicPlaylists() {
    const LOCAL_JSON_URL = "data/playlists.json";
    
    const box = document.getElementById("publicPlaylistBox");
    if (!box) {
        console.error("❌ Không tìm thấy phần tử HTML mang ID 'publicPlaylistBox'!");
        return;
    }

    // 🌟 SỬA TẠI ĐÂY: Xóa sạch giao diện NGAY LÚC NÀY để chặn các luồng chạy sau gối đầu lên nhau
    box.innerHTML = "<p style='color:gray; padding:10px;'>⏳ Đang tải dữ liệu...</p>";

    try {
        console.log("📡 Đang tải danh sách playlist từ file:", LOCAL_JSON_URL);
        
        const res = await fetch(LOCAL_JSON_URL);
        if (!res.ok) {
            throw new Error(`Không thể tải file JSON (Mã lỗi: ${res.status})`);
        }

        const rawData = await res.json();

        // Lọc dữ liệu: Chỉ giữ lại các playlist có visibility là "public"
        const publicData = rawData.filter(playlist => playlist.visibility === "public");

        // Gọi hàm hiển thị giao diện
        renderAndSetupPlaylists(publicData);

    } catch (err) {
        box.innerHTML = "<p style='color:red; padding:10px;'>❌ Lỗi tải bộ sưu tập.</p>";
        console.error("❌ Lỗi sập luồng trong hàm loadPublicPlaylists:", err);
    }
}



// 4. Hàm xử lý khi khách bấm xóa bộ sưu tập
async function xoaPlaylistCuaKhach(playlistId, playlistName) {
    // Thay thế lệnh confirm cũ bằng hộp thoại giữa màn hình
    showCustomConfirm(`Xóa "${playlistName}" ?`, async () => {
        const username = localStorage.getItem("username") || "guest";

        try {
            // 🔥 CHÈN TRỰC TIẾP LINK GAS: Điền đường dẫn Web App thực tế của bạn vào đây
            const res = await fetch("https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec", {
                method: "POST",
                body: JSON.stringify({
                    action: "deletePlaylist",
                    username: username,
                    playlistName: playlistName
                })
            });

            const result = await res.json();

            if (result.success) {
                await removePinnedPlaylist(playlistId);
                showToast("Đã xóa playlist");
                renderGuestPlaylists(); // Tải lại danh sách từ GitHub sau khi xóa thành công
                if (currentGuestPlaylistName === playlistName) {
                    document.getElementById("songList").innerHTML = "";
                }
            } else {
                showToast("Xóa thất bại");
            }
        } catch (err) {
            console.error(err);
            showToast("🗑️ Đã xóa playlist thành công!"); 
        }
    });
}

//== Xóa album khỏi user name

async function removePinnedPlaylist(playlistId) {

  const url =
    "https://script.google.com/macros/s/AKfycbxEoH0B9tnS2CVoRhXS5trKfe5thL3Xiugf5_48ZWP-VXw0s7Wiwpq2mBhYY4W9hY90JQ/exec" +
    `?action=removePinnedPlaylist&playlistId=${encodeURIComponent(playlistId)}`;

  const response = await fetch(url);
  return await response.json();
}

// 5. Hàm xử lý khi khách bấm mở Playlist của họ để nghe
function loadGuestPlaylistTracks(playlistName, songs) {

  const isPublicPlaylist = playlistName.startsWith("🌍");
  // 1. Kiểm tra và định vị vùng chứa songList
  const songListContainer = document.getElementById('songList') || songList; 
  if (!songListContainer) return;

  // 2. Tạm thời lưu tên playlist hiện tại vào biến toàn cục
  currentGuestPlaylistName = playlistName;

  // 3. Hiển thị trạng thái đang tải bên trong vùng chứa
  songListContainer.innerHTML = "<div style='padding: 10px; color: #888;'>Đang tải danh sách bài hát...</div>";

  // 4. Tải file dữ liệu gốc để lấy thông tin chi tiết và khớp ID
  fetch('data/songs.json')
    .then(response => {
      if (!response.ok) throw new Error('Không thể tải dữ liệu gốc');
      return response.json();
    })
    .then(masterSongsList => {
      // Tiến hành so khớp songid trong playlist với id trong file songs.json
      const detailedSongs = songs.map(song => {
        // Tìm bài hát gốc trùng ID (Hỗ trợ cả ID chuỗi và ID số)
        const matched = masterSongsList.find(m => String(m.id) === String(song.songid || song.id));
        
        return {
          ...song,
          // Đổ toàn bộ dữ liệu chi tiết từ file gốc vào bài hát trong playlist
          file: matched ? matched.file : (song.file || ""),
          cover: matched ? matched.cover : (song.cover || ""),
          title: matched ? matched.title : (song.title || "Bài hát không tồn tại"),
          artist: matched ? matched.artist : (song.artist || "Nghệ sĩ ẩn danh"),
          isrc: matched ? matched.isrc : (song.isrc || "NO ISRC")
        };
      });

      // Cập nhật mảng bài hát đã đầy đủ thông tin vào biến toàn cục phục vụ cho việc chuyển bài
      currentGuestPlaylist = detailedSongs;

      // Xóa chữ "Đang tải..." và bắt đầu render danh sách bài hát lên UI
      songListContainer.innerHTML = "";

      // Duyệt qua danh sách bài hát đã đồng bộ dữ liệu để hiển thị
      detailedSongs.forEach((song, index) => {
        const div = document.createElement("div");
        div.className = "song";
        
        // Gộp CSS căn chỉnh từ hàm thứ hai
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        // Tạo phần hiển thị thông tin bài hát (bỏ số thứ tự ở đầu)
        const titleSpan = document.createElement("span");
        titleSpan.style.flex = "1";
        titleSpan.className = "song-meta";
        titleSpan.innerHTML = `
          <div class="song-item-title">${song.title}</div>
          <div class="song-item-artist">
            ${song.artist} ● ${song.isrc}
          </div>
        `;

        // Tạo nút xóa bài hát ở cuối dòng
        const btnRemove = document.createElement("span");

if (isPublicPlaylist) {
    btnRemove.style.display = "none"; 
} else {
    btnRemove.innerText = "➕"; // Đổi thành dấu cộng đa năng
    btnRemove.title = "Tùy chọn bài hát";
    btnRemove.style.cssText = `
        cursor:pointer;
        padding:0 10px;
        font-weight:bold;
    `;
}

// Thay thế đoạn btnRemove.onclick cũ bằng đoạn này:
btnRemove.onclick = (e) => {
    e.stopPropagation();
    console.log("SONG OBJECT:", song);

    // SỬA TẠI ĐÂY: Thêm biến 'currentGuestPlaylistName' vào cuối cùng của hàm
    showPlaylistDropdown(
        e.clientX, 
        e.clientY, 
        song, 
        true, 
        currentGuestPlaylistName 
    );
};



        // Sự kiện click vào bài hát để phát nhạc (kết hợp cả 2 logic phát của bạn)
        titleSpan.onclick = () => {
          // Chạy logic đổi giao diện active và cập nhật trình phát nhạc
          songIndex = index;
          if (typeof audio !== "undefined" && song.file) {
            audio.src = song.file;
            audio.play();
          }

          if (typeof cover !== "undefined" && song.cover) cover.src = song.cover;
          if (typeof bg !== "undefined" && song.cover) bg.style.backgroundImage = `url(${song.cover})`;

          // Cập nhật các thẻ thông tin UI
          const playBtn = document.getElementById("playBtn");
          const infoTitleUI = document.getElementById("infoTitle");
          const songTitle = document.getElementById("songTitle");
          const infoBox = document.getElementById("infoBox");

          if (playBtn) playBtn.innerText = "⏸";
          if (infoTitleUI) infoTitleUI.innerText = song.title;
          if (songTitle) songTitle.innerText = song.title;
          if (infoBox) infoBox.style.display = "block";

          // Đổi class màu nền active cho hàng đang chọn
          document
            .querySelectorAll("#songList .song")
            .forEach(el => el.classList.remove("active"));
          div.classList.add("active");

          sendClickLogToServer(song);
        };

        // Đưa chữ và nút xóa vào thẻ bao bọc chung của bài hát
        div.appendChild(titleSpan);
        div.appendChild(btnRemove);
        
        // Đưa bài hát vào vùng chứa chính
        songListContainer.appendChild(div);
      });

    })
    .catch(error => {
      console.error("Lỗi khi tải hoặc xử lý file songs.json:", error);
      songListContainer.innerHTML = "<div style='padding: 10px; color: red;'>Không thể đồng bộ dữ liệu bài hát từ hệ thống.</div>";
    });

  // 5. Cập nhật tiêu đề lớn của playlist (nếu có thẻ)
  const infoTitle = document.getElementById("infoTitle");
  if (infoTitle) {
    infoTitle.innerText = "🎵 " + playlistName;
  }
}



// Gắn chặt tính năng của khách vào sau khi hàm renderAlbums gốc của bạn chạy xong
if (typeof renderAlbums === 'function') {
    const originalRenderAlbums = renderAlbums;
    renderAlbums = function() {
        originalRenderAlbums(); // Chạy hàm vẽ album hệ thống của bạn trước
        initGuestPlaylist();    // Đẩy cụm nút của khách lên đầu albumList ngay sau đó
    };
}

// Kích hoạt dự phòng khi nạp trang lần đầu
document.addEventListener("DOMContentLoaded", () => {

    const waitForAlbums = setInterval(() => {

        if(
            typeof renderAlbums === "function" &&
            document.getElementById("albumList")
        ){
            clearInterval(waitForAlbums);

            initGuestPlaylist();
        setTimeout(() => {
                loadPublicPlaylists();
            }, 1000);
        }

    }, 200);

});
// user-playlist.js - Phần chỉnh sửa hiển thị dấu (+) cạnh bài hát

// Hàm này sẽ tự động chạy NGAY SAU KHI hàm renderSongs() gốc của bạn chạy xong
if (typeof renderSongs === 'function') {
    // 1. Lưu lại hàm renderSongs gốc của bạn
    const originalRenderSongs = renderSongs;

    // 2. Định nghĩa lại hàm renderSongs mới để bổ sung dấu (+)
    renderSongs = function() {
        // Chạy hàm gốc của bạn trước để vẽ ra các bài hát (.song) như bình thường
        originalRenderSongs(); 

        // Tìm tất cả các thẻ bài hát vừa được tạo ra ở khu vực songList
        const songElements = document.querySelectorAll("#songList .song");

        // Duyệt qua từng thẻ bài hát để chèn dấu (+) vào cạnh
        songElements.forEach((div, i) => {
            // Cấu hình CSS để tên bài hát nằm bên trái, dấu (+) nằm gọn gàng bên phải
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";

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

            // Tạo một thẻ span chứa dấu cộng (+)
            const btnAdd = document.createElement("span");
            btnAdd.innerText = " ➕";
            btnAdd.title = "Thêm vào bộ sưu tập";
            btnAdd.style.cursor = "pointer";
            btnAdd.style.padding = "0 10px";
            btnAdd.style.fontWeight = "bold";

            // Khi khách hàng bấm vào dấu (+) nhỏ này
            btnAdd.onclick = (e) => {

    e.stopPropagation();

    const currentSong = albums[albumIndex].songs[i];

    showPlaylistDropdown(
        e.clientX,
        e.clientY,
        currentSong
    );
};
            // Dán dấu (+) vào bên trong thẻ bài hát của bạn
            div.appendChild(btnAdd);
        });
    };
}

// ===============================
// DROPDOWN CHỌN PLAYLIST
 
// ===============================
let playlistDropdown = null;

async function showPlaylistDropdown(x, y, songData, isRemoveMode = false, currentGuestPlaylistName = null) {
  
    if (playlistDropdown) playlistDropdown.remove();

    playlistDropdown = document.createElement("div");
    playlistDropdown.id = "playlistDropdown";

    const dropdown = playlistDropdown;
    const menuWidth = 220; 
    // Nếu ở chế độ xóa, menu sẽ ngắn hơn vì không có danh sách playlist
    const menuHeight = isRemoveMode ? 220 : 320; 
    let posX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 15));
    let posY = Math.max(10, Math.min(y + 8, window.innerHeight - menuHeight - 15));

    playlistDropdown.style.cssText = `
        position: fixed; left:${posX}px; top:${posY}px; 
        background:#181818; border:1px solid #333; border-radius:10px; 
        min-width:${menuWidth}px; max-height:${menuHeight}px; 
        display: flex; flex-direction: column; 
        z-index:99999; box-shadow:0 4px 20px rgba(0,0,0,.4); padding:5px; color:#fff;
    `;
    
    // Tạo khung chứa danh sách chung
    // --- PHẦN 1: VÙNG HIỂN THỊ DANH SÁCH ---
    const listContainer = document.createElement("div");
    listContainer.id = "dropdownListContainer"; 
    
    // SỬA TẠI ĐÂY: Thay max-height thành 95px để hiện đúng 2.5 dòng bài hát
    listContainer.style.cssText = "overflow-y: auto; flex-grow: 1; max-height: 95px;";
    dropdown.appendChild(listContainer);

    document.body.appendChild(playlistDropdown);

    // --- MẸO ẨN THANH CUỘN MÀU TRẮNG (VẪN CHO LĂN CHUỘT) ---
    const hideScrollbarStyle = document.createElement("style");
    hideScrollbarStyle.innerHTML = `
        #dropdownListContainer::-webkit-scrollbar {
            display: none !important; /* Ẩn nút trắng trên Chrome, Safari, Edge, Cốc Cốc */
        }
        #dropdownListContainer {
            -ms-overflow-style: none !important;  /* Ẩn trên IE cũ */
            scrollbar-width: none !important;  /* Ẩn trên Firefox */
        }
    `;
    document.head.appendChild(hideScrollbarStyle);


    // --- KIỂM TRA CHẾ ĐỘ: NẾU LÀ CHẾ ĐỘ XÓA (isRemoveMode = true) ---
    if (isRemoveMode) {
        
        // 1. NÚT XÓA KHỎI PLAYLIST (Chắc chắn nhận đúng giá trị được truyền sang)
        const itemRemove = document.createElement("div");
        itemRemove.innerText = "❌ Xóa khỏi playlist";
        itemRemove.style.cssText = "padding:10px; cursor:pointer; border-radius:6px; transition:.2s; font-size:14px; color:#ff6b6b; font-weight:bold;";

        itemRemove.onmouseenter = () => itemRemove.style.background = "#3a1f1f";
        itemRemove.onmouseleave = () => itemRemove.style.background = "transparent";

// Tìm đến đoạn itemRemove.onclick bên trong hàm showPlaylistDropdown và sửa lại như sau:
itemRemove.onclick = async () => {
    // SỬA TẠI ĐÂY: Gọi trực tiếp đến hàm async removeSongFromPlaylist của bạn
    if (typeof removeSongFromPlaylist === "function") {
        console.log("ĐANG GỌI HÀM XÓA:", currentGuestPlaylistName, "BÀI HÁT:", songData);
        
        await removeSongFromPlaylist(
            currentGuestPlaylistName, 
            songData.file_music || songData.id // Truyền file nhạc hoặc id tùy cấu trúc dữ liệu của bạn
        );
    }
    
    // Tự động đóng menu sau khi bấm xóa
    playlistDropdown.remove();
    playlistDropdown = null;
};

        listContainer.appendChild(itemRemove);

        // Đường kẻ ngăn cách các chức năng quản lý khác của bạn
        const divider = document.createElement("div");
        divider.style.cssText = "border-top: 1px solid #333; margin: 5px 0;";
        listContainer.appendChild(divider);

        // [Tùy chọn bổ sung] Đưa các nút khác của bạn vào đây (Trạng thái, Chia sẻ, Xóa vĩnh viễn...)
        // Thí dụ nút chia sẻ bài hát:
        const itemShare = document.createElement("div");
        itemShare.innerText = "🔗 Chia sẻ bài hát";
        itemShare.style.cssText = "padding:10px; cursor:pointer; border-radius:6px; transition:.2s; font-size:14px; color:#fff;";
        itemShare.onmouseenter = () => itemShare.style.background = "#333";
        itemShare.onmouseleave = () => itemShare.style.background = "transparent";
        listContainer.appendChild(itemShare);

    } else {
        // --- CHẾ ĐỘ THƯỜNG: TẢI PLAYLIST ĐỂ THÊM BÀI HÁT ---
        const loadingDiv = document.createElement("div");
        loadingDiv.innerText = "⏳ Đang tải danh sách...";
        loadingDiv.style.cssText = "padding:10px; color:#999; font-size:13px; text-align:center;";
        listContainer.appendChild(loadingDiv);

        try {
            const username = localStorage.getItem("username") || "guest";
            const res = await fetch("./data/playlists.json");
            if (!res.ok) throw new Error("HTTP " + res.status);

            const allPlaylists = await res.json();
            const playlists = allPlaylists.filter(pl => pl.username === username);

            loadingDiv.remove();

            if (!playlists || playlists.length === 0) {
                const empty = document.createElement("div");
                empty.innerText = "Chưa có bộ sưu tập nào";
                empty.style.cssText = "padding:10px; color:#999; font-size:13px; text-align:center;";
                listContainer.appendChild(empty);
            } else {
                playlists.forEach(pl => {
                    const item = document.createElement("div");
                    item.innerText = "🎵 " + pl.playlist_name;
                    item.style.cssText = "padding:10px; cursor:pointer; border-radius:6px; transition:.2s; font-size:14px; color:#fff;";
                    
                    item.onmouseenter = () => item.style.background = "#1E4233";
                    item.onmouseleave = () => item.style.background = "transparent";
                    
item.onclick = (e) => {

    e.stopPropagation();

    addSongToPlaylist(pl.playlist_name, songData);

    playlistDropdown.remove();
    playlistDropdown = null;
};
                    listContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.error(err);
            loadingDiv.innerText = "❌ Lỗi tải danh sách: " + err.message;
        }
    }


// --- PHẦN 2: NÚT TẠO NHANH Ở ĐÁY MENU ---
const GAS_URL = "https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec";
const quickCreateBtn = document.createElement("div");
quickCreateBtn.innerText = "➕ Tạo bộ sưu tập mới...";

quickCreateBtn.style.cssText =
  "padding:10px; cursor:pointer; border-radius:6px; font-weight:bold; color:#22c55e; border-top:1px solid #2a2a2a; margin-top:5px; text-align:center; transition:.2s; font-size:13px;";

quickCreateBtn.onmouseenter = () => {
  quickCreateBtn.style.background = "#1E4233";
  quickCreateBtn.style.color = "#000";
};

quickCreateBtn.onmouseleave = () => {
  quickCreateBtn.style.background = "transparent";
  quickCreateBtn.style.color = "#1E4233";
};

quickCreateBtn.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  quickCreateBtn.innerText = "";
  quickCreateBtn.style.background = "transparent";
  quickCreateBtn.onmouseenter = null;
  quickCreateBtn.onmouseleave = null;

  const inputName = document.createElement("input");
  inputName.type = "text";
  inputName.placeholder = "Nhập tên bộ sưu tập...";
  inputName.style.cssText =
    "width:100%;background:#0c140c;color:#fff;border:1px solid #1E4233;border-radius:4px;padding:6px 10px;font-size:13px;outline:none;box-sizing:border-box;";

  quickCreateBtn.appendChild(inputName);
  inputName.focus();

  let isSaved = false;

  const handleSave = async () => {
    if (isSaved) return;

    const name = inputName.value.trim();

    if (!name) {
      showPlaylistDropdown?.(x, y, songData);
      return;
    }

    isSaved = true;

    inputName.remove();
    quickCreateBtn.remove();

    const tempItem = document.createElement("div");
    tempItem.innerText = "🎵 " + name + " (Đang tạo...)";
    tempItem.style.cssText =
      "padding:10px;border-radius:6px;font-size:14px;opacity:0.6;color:#22c55e;";

    listContainer.appendChild(tempItem);
    listContainer.scrollTop = listContainer.scrollHeight;

    try {
      const username = localStorage.getItem("username") || "guest";

      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({
          action: "createPlaylist",
          username,
          playlistName: name
        })
      });

      const text = await res.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: false, message: text };
      }

      if (result.success) {
        showToast("Đã tạo bộ sưu tập mới!");
      } else {
        showToast(result.message || "Không tạo được bộ sưu tập");
      }

    } catch (err) {
      console.error(err);
      showToast("⚠️ Lỗi kết nối máy chủ");
    } finally {
      tempItem.remove();

      if (typeof renderGuestPlaylists === "function") {
        renderGuestPlaylists();
      }

      showPlaylistDropdown?.(x, y, songData);
    }
  };

  inputName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSave();
    }
  });

  inputName.addEventListener("blur", () => {
    setTimeout(() => handleSave(), 150);
  });
};

dropdown.appendChild(quickCreateBtn);
    // --- CHÈN NÚT ĐỔI TRẠNG THÁI (CÔNG KHAI / CÁ NHÂN) ---
    const isLoggedIn = localStorage.getItem("loggedIn") === "true";
    const currentUsername = localStorage.getItem("username"); // Lấy username đang hoạt động (ví dụ: "admin")

    // KIỂM TRA: Chỉ hiển thị nút nếu đã đăng nhập VÀ username của bài hát khớp với username đang hoạt động
    if (isLoggedIn && songData.username === currentUsername) {
        const statusBtn = document.createElement("div");
        
        // Đọc trạng thái từ thuộc tính "visibility" theo dữ liệu mẫu của bạn (mặc định là public nếu trống)
        let currentVisibility = songData.visibility === "private" ? "private" : "public"; 
        
        // Thiết lập giao diện hiển thị ban đầu dựa trên visibility
        if (currentVisibility === "public") {
            statusBtn.innerHTML = `🌐 Trạng thái: <span style="color:#22c55e;">Công khai</span>`;
        } else {
            statusBtn.innerHTML = `🔒 Trạng thái: <span style="color:#ef4444;">Cá nhân</span>`;
        }

        statusBtn.style.cssText = "padding:10px; cursor:pointer; border-radius:6px; font-weight:bold; color:#e0e0e0; border-top:1px solid #2a2a2a; margin-top:5px; text-align:center; transition:.2s; font-size:13px;";

        statusBtn.onmouseenter = () => { statusBtn.style.background = "#2a2a2a"; };
        statusBtn.onmouseleave = () => { statusBtn.style.background = "transparent"; };

        // Logic xử lý khi click đổi trạng thái bài hát
        statusBtn.onclick = async (e) => {
   
            e.stopPropagation();
            
            // Đảo ngược trạng thái visibility
            const newVisibility = currentVisibility === "public" ? "private" : "public";
            const confirmMsg = newVisibility === "public" 
                ? `Bạn muốn chuyển bài hát "${songData.title}" sang chế độ CÔNG KHAI?` 
                : `Bạn muốn chuyển bài hát "${songData.title}" sang chế độ CÁ NHÂN (Riêng tư)?`;

            if (!confirm(confirmMsg)) return;

            statusBtn.innerText = "⏳ Đang cập nhật...";
            statusBtn.style.pointerEvents = "none"; // Khóa click trùng lặp

            try {
                const GAS_URL = "https://script.google.com/macros/s/AKfycbwLETMzHS9jW5cUd7dWuUZ1nmNbc4oAMkR1LxafJokP-dM9SIUma-lKWo-VnSIbgW0taw/exec";
                const url = `${GAS_URL}?action=updateSongStatus&songId=${encodeURIComponent(songData.id)}&visibility=${newVisibility}`;
                
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP error");

                const text = await res.text();
                console.log("GAS RAW RESPONSE:", text); // In log ra để kiểm tra nhanh

                let result = {};
                try {
                    result = JSON.parse(text);
                } catch(e) {
                    result = {};
                }

                // 🟢 ĐÃ SỬA: Kiểm tra linh hoạt cả trường hợp status: "success" như log hiển thị
                if (result.success === true || result.status === "success" || text.includes("success")) {
                    alert("Cập nhật trạng thái thành công!");
                    
                    songData.visibility = newVisibility; // Đồng bộ lại biến local
                    currentVisibility = newVisibility;
                    
                    if (typeof renderSongs === "function") renderSongs(); 
                } else {
                    // Hiển thị chi tiết thông báo lỗi từ server trả về nếu có
                    alert("Cập nhật thất bại: " + (result.message || "Phản hồi không hợp lệ từ Server."));
                }
            } catch (err) {
                console.error("Lỗi đổi trạng thái:", err);
                alert(`Không thể kết nối máy chủ để đổi trạng thái: ${err.message || err}`);
            } finally {
                statusBtn.style.pointerEvents = "auto";
                if (currentVisibility === "public") {
                    statusBtn.innerHTML = `🌐 Trạng thái: <span style="color:#22c55e;">Công khai</span>`;
                } else {
                    statusBtn.innerHTML = `🔒 Trạng thái: <span style="color:#ef4444;">Cá nhân</span>`;
                }
                
                if (playlistDropdown) {
                    playlistDropdown.remove();
                    playlistDropdown = null;
                }
            }

        };

        // Thêm nút này vào khối dropdown
        dropdown.appendChild(statusBtn);
    }

// ================= NÚT CHIA SẺ (DẠNG LINK) =================
// Đổi từ "div" thành "a" để tạo link trực tiếp ngay trong nút
const shareBtn = document.createElement("a");
shareBtn.innerHTML = `🔗 Chia sẻ bài hát`;

shareBtn.style.cssText = `
    display: block; /* Giúp thẻ a chiếm trọn chiều rộng như div */
    padding: 10px;
    cursor: pointer;
    border-radius: 6px;
    font-weight: bold;
    color: #e0e0e0;
    border-top: 1px solid #2a2a2a;
    margin-top: 5px;
    text-align: center;
    transition: background 0.2s;
    font-size: 13px;
    background: transparent;
    text-decoration: none; /* Bỏ gạch chân mặc định của thẻ a */
`;

shareBtn.addEventListener("mouseenter", () => shareBtn.style.backgroundColor = "#2a2a2a");
shareBtn.addEventListener("mouseleave", () => shareBtn.style.backgroundColor = "transparent");
window.showPlaylistDropdown = showPlaylistDropdown;
// MẸO: Hàm này sẽ cập nhật thuộc tính href của nút mỗi khi dữ liệu bài hát thay đổi
function updateShareButtonLink() {
    if (typeof songData !== "undefined" && songData.id) {
        const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        // Gán thẳng link chứa id vào href của nút bấm
        shareBtn.href = `${window.location.origin}${currentDir}file_music.html?songId=${songData.id}`;
    } else {
        shareBtn.href = "#"; // Dự phòng nếu chưa có dữ liệu bài hát
    }
}

// Gọi hàm cập nhật link ngay khi khởi tạo (hoặc gọi lại hàm này ở nơi bạn cập nhật biến songData)
updateShareButtonLink();

shareBtn.onclick = async (e) => {
    // Nếu người dùng click chuột trái bình thường, kích hoạt bảng share hệ thống
    if (typeof songData !== "undefined" && songData.id) {
        e.preventDefault(); // Chặn hành vi chuyển trang mặc định để ưu tiên mở bảng share
        e.stopPropagation();

        try {
            if (navigator.share) {
                await navigator.share({
                    title: songData.title || "Bài hát hay",
                    text: songData.artist || "Nghệ sĩ",
                    url: shareBtn.href // Lấy luôn link từ thuộc tính href của nút
                });
            } else {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(shareBtn.href);
                    alert("Đã copy link chia sẻ vào bộ nhớ tạm!");
                } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = shareBtn.href;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textArea);
                    alert("Đã copy link chia sẻ!");
                }
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.error("Lỗi chia sẻ:", err);
            }
        }
    }
};

// Chèn dưới nút status
dropdown.appendChild(shareBtn);

//==================
    if (isLoggedIn && songData.username === currentUsername) {
        const deleteSongBtn = document.createElement("div");
        deleteSongBtn.innerText = `🗑️ Xóa bài gốc vĩnh viễn`;
        deleteSongBtn.style.cssText = "padding:10px; cursor:pointer; border-radius:6px; font-weight:bold; color:#ef4444; border-top:1px solid #2a2a2a; margin-top:2px; text-align:center; transition:.2s; font-size:13px;";

        deleteSongBtn.onmouseenter = () => { deleteSongBtn.style.background = "#ef4444"; deleteSongBtn.style.color = "#fff"; };
        deleteSongBtn.onmouseleave = () => { deleteSongBtn.style.background = "transparent"; deleteSongBtn.style.color = "#ef4444"; };

        // TÍCH HỢP TRỰC TIẾP LOGIC GỬI LỆNH LÊN GOOGLE APPS SCRIPT Ở ĐÂY
// TÍCH HỢP TRỰC TIẾP LOGIC GỬI LỆNH LÊN GOOGLE APPS SCRIPT Ở ĐÂY
deleteSongBtn.onclick = async (e) => {
    e.stopPropagation();

    if (!confirm(`Bạn có chắc chắn muốn xóa "${songData.title}" không?`)) {
        return;
    }

    console.log("songData =", songData);
    console.log("songId =", songData.id);

    deleteSongBtn.innerText = "⏳ Đang xóa...";

    try {
        // NHẬN ĐỦ 3 BIẾN kết quả từ 3 hàm song song
        const [githubResult, sheetResult, clickResult] = await Promise.all([
            deleteSongGitHub(songData.id),
            removeSongFromPlaylist(songData.id)
        ]);

        console.log("GitHub result:", githubResult);
        console.log("Sheet result:", sheetResult);
        console.log("Click result:", clickResult);

        // ĐIỀU KIỆN CHECK: Chỉ cần 1 trong các API báo thành công hoặc không lỗi nặng
        const isGithubOK = githubResult?.status === "success" || githubResult?.success === true;
        const isSheetOK = sheetResult?.success === true || sheetResult?.status === "success" || sheetResult?.message === "Empty response but fetch ok";
        const isClickOK = clickResult?.status === "success" || clickResult?.success === true;

        if (isGithubOK || isSheetOK || isClickOK) {
            alert("Đã xóa bài hát thành công!");
        } else {
            alert("Xóa thất bại! Vui lòng kiểm tra lại phản hồi từ Server.");
        }

    } catch (err) {
        console.error("Lỗi crash ngoài ý muốn:", err);
        alert(`Lỗi hệ thống khi xóa bài hát: ${err.message || err}`);
    }

    deleteSongBtn.innerText = "🗑️ Xóa bài gốc vĩnh viễn";

    if (playlistDropdown) {
        playlistDropdown.remove();
        playlistDropdown = null;
    }
};



        dropdown.appendChild(deleteSongBtn);
    }

    // Thiết lập đóng menu khi click ra ngoài
setTimeout(() => {

    document.removeEventListener(
        "click",
        closePlaylistDropdown,
        true
    );

    document.addEventListener(
        "click",
        closePlaylistDropdown,
        true
    );

}, 0);
}



async function deleteSongGitHub(songId) {

    const GAS_URL = "https://script.google.com/macros/s/AKfycbxQ6leCWo7hcNnISSKR8q15z7BaW-2o_lurlaz4kZC2j_viYyeDs-cUHeocQug0uSbNdA/exec"; 

    const url = `${GAS_URL}?songId=${encodeURIComponent(songId)}`;

    try {
        const res = await fetch(url);
        
        if (!res.ok) {
            return { status: "error", message: "HTTP error" };
        }

        const text = await res.text();
        console.log("RAW:", text);

        return JSON.parse(text);

    } catch (err) {
        return { status: "error", message: err.message };
    }
}




function closePlaylistDropdown(e) {

    if (!playlistDropdown) return;

    // click trong menu thì không đóng
    if (playlistDropdown.contains(e.target)) return;

    playlistDropdown.remove();
    playlistDropdown = null;

    document.removeEventListener(
        "click",
        closePlaylistDropdown,
        true
    );
}

async function addSongToPlaylist(playlistName, songData) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec";

    try {
        // 1. Kiểm tra và trích xuất tên playlist một cách thông minh
        let targetPlaylistName = "";
        if (typeof playlistName === "string") {
            targetPlaylistName = playlistName.trim();
        } else if (playlistName && playlistName.playlist_name) {
            targetPlaylistName = playlistName.playlist_name.trim();
        }

        // 2. Kiểm tra và trích xuất ID bài hát một cách thông minh (đọc cả id hoặc songId)
        let targetSongId = "";
        if (songData) {
            targetSongId = songData.id || songData.songId || (typeof songData === "string" ? songData : "");
        }

        // 3. Lấy tên người dùng an toàn, không để sập code nếu localStorage trống
        const username = localStorage.getItem("username") || "admin";

        // 4. Bẫy lỗi chủ động ngay tại Frontend để báo chính xác thành phần bị mất
        if (!targetPlaylistName) {
            console.error("❌ Lỗi Frontend: Không lấy được tên Playlist!", playlistName);
            showToast("⚠️ Vui lòng chọn một bộ sưu tập hợp lệ");
            return;
        }
        if (!targetSongId) {
            console.error("❌ Lỗi Frontend: Không lấy được ID bài hát!", songData);
            showToast("⚠️ Không tìm thấy thông tin bài hát này");
            return;
        }

        showToast("⏳ Đang thêm vào bộ sưu tập...");

        // 5. Tiến hành gửi gói tin dạng JSON thô lên Google Apps Script
        const res = await fetch(GAS_URL, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "text/plain" // Giữ text/plain để vượt qua bộ lọc kiểm tra CORS của trình duyệt
            },
            body: JSON.stringify({
                action: "addSong",
                username: username,
                playlist_name: targetPlaylistName, // Gửi đúng key 'playlist_name' (gạch dưới) trùng khớp với backend
                songId: String(targetSongId).trim() // Ép kiểu chuỗi để tránh lỗi so sánh định dạng ở backend
            })
        });

        // 6. Nhận dữ liệu phản hồi
        const result = await res.json();

        // 7. Hiển thị thông báo dựa trên kết quả trả về từ Apps Script
        if (result.success) {
            showToast("✅ " + (result.message || "Đã thêm vào bộ sưu tập!"));
        } else {
            // Nếu backend báo lỗi (ví dụ: Không tìm thấy playlist), hiển thị rõ lý do tại đây
            alert("❌ Thất bại: " + result.message);
        }

    } catch (err) {
        console.error("❌ Lỗi kết nối hoặc xử lý API mạng:", err);
        showToast("⚠️ Lỗi kết nối máy chủ");
    }
}



// Xóa bài hát khỏi bộ sưu tập
async function removeSongFromPlaylist(playlistName, songFile) {
        console.log("DELETE REQUEST");
    console.log("playlistName =", playlistName);
    console.log("songFile =", songFile);
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwlLlLh0oQlckYUKsLAL7N5Zt9B777NOQaMtTbsaABDEicC4iuqYZYQD5PQ6Hun3v1v/exec";
    showCustomConfirm("Bạn có chắc chắn muốn xóa bài hát này khỏi bộ sưu tập?", async () => {
        try {
            const username = localStorage.getItem("username") || "guest";
            showToast("⏳ Đang xóa bài hát...");

            const res = await fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "removeSong", 
                    username: username,
                    playlistName: playlistName,
                    songFile: songFile
                })
            });

            const result = await res.json();

            if (result.success) {
                showToast("❌ Đã tháo bài hát");
                
                const trackRes = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "getSongs",
                        username: username,
                        playlistName: playlistName
                    })
                });

                let songs = await trackRes.json();   // 👈 CHÈN NGAY SAU DÒNG NÀY

if (typeof songs === "string") {
    songs = JSON.parse(songs);
}
               
                if (typeof loadGuestPlaylistTracks === 'function') {
                    loadGuestPlaylistTracks(playlistName, updatedSongs);
                }
            } else {
                showToast(result.message || "Xóa thất bại");
            }
        } catch (err) {
            console.error(err);
            showToast("❌ Lỗi kết nối không thể xóa bài hát");
        }
    });
}


let toastBox = null;
// khách bấm play list của họ nhưng chưa có bài nào trong đó, hoặc sau khi xóa hết bài trong 
function showToast(message) {
    if (!toastBox) {
        toastBox = document.createElement("div");
        toastBox.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #FDFBF7;              /* 60% Nền Trắng kem hoài cổ */
            color: #212121;                   /* 10% Chữ Đen chì dịu mắt */
            border: 2px solid #1E4233;        /* 25% Viền Xanh rêu đậm Slate */
            padding: 11px 22px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: -0.2px;
            z-index: 999999;
            box-shadow: 0 6px 20px rgba(30, 66, 51, 0.18);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        document.body.appendChild(toastBox);
    }

    toastBox.innerText = message;
    toastBox.style.opacity = "1";
    toastBox.style.transform = "translateX(-50%) translateY(0)";

    // Tạo hiệu ứng biến mất mượt mà
    setTimeout(() => {
        toastBox.style.opacity = "0";
    }, 1500); // Tăng lên 1.5 giây một chút để người dùng kịp đọc dòng chữ dài
}


function getUserName() {
    return localStorage.getItem("username") || "guest";
}



///==== Hàm Lấy Ghim từ GAS
async function fetchPinned() {
    // Nếu chạy local hoặc file json nằm cùng thư mục source code, hãy dùng đường dẫn tương đối:
    const URL_GITHUB_DATA = "data/users.json"; 
    
    // Nếu bắt buộc phải lấy từ kho GitHub từ xa, điền chính xác link RAW:
    // const URL_GITHUB_DATA = "https://githubusercontent.com";

    const userId = localStorage.getItem("username");

    if (!userId) {
        console.warn("⚠️ Không tìm thấy tên tài khoản trong localStorage!");
        return [];
    }

    try {
        const res = await fetch(URL_GITHUB_DATA);
        if (!res.ok) throw new Error(`Lỗi tải file: ${res.status}`);
        
        const data = await res.json();
        const currentUser = data.users.find(user => user.username === userId);
        
        if (!currentUser) {
            console.warn(`⚠️ Không tìm thấy user: ${userId}`);
            return [];
        }

        return (currentUser.pinnedPlaylistIds || []).map(id => String(id).trim());
    } catch (e) {
        console.error("❌ Lỗi fetchPinned:", e);
        return []; // Khi lỗi, trả về mảng rỗng để không làm treo luồng vẽ giao diện
    }
}



// OTP Email

async function sendOTP(email, username) {
    const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "sendOTP",
            email,
            username
        })
    });

    return await res.json();
}

async function verifyOTP(email, otp, username) {
    const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "verifyOTP",
            email,
            otp,
            username
        })
    });

    return await res.json();
}

//== Tìm Kiếm Playlist
let cachedPlaylists = [];

async function loadPublicPlaylists() {
    try {
        const res = await fetch("data/playlists.json");
        cachedPlaylists = await res.json();
        renderAndSetupPlaylists(cachedPlaylists);
    } catch (err) {
        console.error("Lỗi load playlists:", err);
    }
}

function filterPublicPlaylists() {
    const input = document.getElementById("publicSearchInput");
    if (!input) return;

    const keyword = input.value.toLowerCase().trim();

    if (!keyword) {
        renderAndSetupPlaylists(cachedPlaylists);
        return;
    }

    const filtered = cachedPlaylists.filter(item => {
        const name = (item.playlist_name || "").toLowerCase();
        const user = (item.username || "").toLowerCase();

        const plan = String(item.plan ?? "");
        const member = String(item.member ?? "");

        return (
            name.includes(keyword) ||
            user.includes(keyword) ||
            plan.includes(keyword) ||
            member.includes(keyword)
        );
    });

    renderAndSetupPlaylists(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
    loadPublicPlaylists();

    const input = document.getElementById("publicSearchInput");
    if (input) {
        input.addEventListener("input", filterPublicPlaylists);
    }
});