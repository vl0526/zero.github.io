import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.140.0/build/three.module.js";

// Tạo Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Mặt đất
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Nhân vật (hộp vuông)
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Camera theo dõi nhân vật
camera.position.set(0, 5, 10);
camera.lookAt(player.position);

// Điều khiển nhân vật
const speed = 0.2;
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") player.position.z -= speed;
    if (event.key === "ArrowDown") player.position.z += speed;
    if (event.key === "ArrowLeft") player.position.x -= speed;
    if (event.key === "ArrowRight") player.position.x += speed;

    // Camera luôn nhìn theo nhân vật
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);
});

// Đạn
const bullets = [];
document.addEventListener("click", () => {
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.set(player.position.x, player.position.y, player.position.z);
    bullets.push(bullet);
    scene.add(bullet);
});

// Vòng lặp render
function animate() {
    requestAnimationFrame(animate);

    // Cập nhật vị trí đạn
    bullets.forEach((bullet) => {
        bullet.position.z -= 0.5;
    });

    renderer.render(scene, camera);
}
animate();
