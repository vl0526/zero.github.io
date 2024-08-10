function openDouyin() {
    window.open('https://www.douyin.com/search/沙雕动画', '_blank');
    window.open('https://bravedown.com/douyin-video-downloader', '_blank');
}

function openIxigua() {
    window.open('https://www.ixigua.com/search/沙雕动画', '_blank');
    window.open('https://bravedown.com/ixigua-video-downloader', '_blank');
}

function openBilibili() {
    window.open('https://bravedown.com/bilibili-downloader', '_blank');
    window.open('https://search.bilibili.com/all?keyword=沙雕动画', '_blank');
}

function downloadCapCut() {
    window.open('https://lf16-capcut.faceulv.com/obj/capcutpc-packages-us/installer/capcut_capcutpc_0_1.2.6_installer.exe', '_blank');
}

function openCapCutApp() {
    // Note: Opening local files directly in a browser is generally not supported for security reasons.
    // However, if this is meant to be a part of a local application, you can use a protocol handler or other methods
    // that are specific to your environment.

    // Example to show how you might handle it, but this won't work directly from a browser:
    // window.open('file:///D:/app/capcut/bộ nhớ đệm/CapCut/CapCut.exe --src1', '_blank');
    
    // For actual implementation, consider using desktop app methods or custom protocols if necessary.
    alert('Please open the application manually from: D:\\app\\capcut\\bộ nhớ đệm\\CapCut\\CapCut.exe --src1');
}

function toggleCapcutOptions() {
    const options = document.getElementById('capcut-options');
    options.style.display = options.style.display === 'none' || options.style.display === '' ? 'block' : 'none';
}
