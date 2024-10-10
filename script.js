const startStreamBtn = document.getElementById('startStreamBtn');
const stopStreamBtn = document.getElementById('stopStreamBtn');
const screenVideo = document.getElementById('screenVideo');
const streamLink = document.getElementById('streamLink');
const linkContainer = document.getElementById('linkContainer');
const errorMsg = document.getElementById('errorMsg');

let mediaStream = null;

// Hàm để bắt đầu quay màn hình và livestream
startStreamBtn.addEventListener('click', async () => {
    try {
        // Yêu cầu quyền quay màn hình với âm thanh
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        // Hiển thị video quay màn hình cục bộ
        screenVideo.srcObject = mediaStream;
        screenVideo.style.display = 'block';

        // Hiển thị nút dừng stream
        stopStreamBtn.style.display = 'inline-block';
        startStreamBtn.style.display = 'none';

        // Giả lập tạo link livestream
        const uniqueLink = window.location.href + 'live/' + Date.now();
        streamLink.href = uniqueLink;
        streamLink.textContent = uniqueLink;
        linkContainer.style.display = 'block';

        // TODO: Tích hợp phần WebRTC signaling server để chia sẻ với người khác

    } catch (err) {
        console.error("Error starting screen share: ", err);
        errorMsg.textContent = 'Screen sharing failed. Please try again.';
        errorMsg.style.display = 'block';
    }
});

// Hàm để dừng livestream và tắt video
stopStreamBtn.addEventListener('click', () => {
    if (mediaStream) {
        let tracks = mediaStream.getTracks();
        tracks.forEach(track => track.stop());
        screenVideo.style.display = 'none';
        linkContainer.style.display = 'none';
        stopStreamBtn.style.display = 'none';
        startStreamBtn.style.display = 'inline-block';
        errorMsg.style.display = 'none';
    }
});

// Bắt sự kiện khi trang bị đóng hoặc tải lại
window.addEventListener('beforeunload', () => {
    if (mediaStream) {
        let tracks = mediaStream.getTracks();
        tracks.forEach(track => track.stop());
    }
});
