const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const shareLinkContainer = document.getElementById('shareLinkContainer');
const shareLinkInput = document.getElementById('shareLink');

// Các biến để lưu trữ luồng video và kết nối
let localStream;
let peerConnection;
const iceServer = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // STUN server
    ]
};

startBtn.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection(iceServer);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Gửi candidate đến người khác (qua backend)
                console.log('New ICE candidate: ', event.candidate);
            }
        };

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        // Gửi offer đến người khác (qua backend)
        console.log('Offer: ', offer);
        
        // Hiển thị link chia sẻ
        const shareableLink = `https://yourdomain.com/video.html`; // Thay bằng domain của bạn
        shareLinkInput.value = shareableLink;
        shareLinkContainer.style.display = 'block';

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
    } catch (error) {
        console.error('Error starting livestream:', error);
    }
});

stopBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
        stopBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';

        if (peerConnection) {
            peerConnection.close();
        }
    }
});
