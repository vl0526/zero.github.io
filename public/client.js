import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.140.0/build/three.module.js";

const socket = io({ path: "/api/socket" });

// Setup Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Mặt đất
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = - Math.PI / 2;
scene.add(ground);

// Nhân vật
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

camera.position.z = 5;

let players = {};
socket.on("updatePlayers", (data) => {
    players = data;
});

// Điều khiển nhân vật
const speed = 0.1;
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") player.position.z -= speed;
    if (event.key === "ArrowDown") player.position.z += speed;
    if (event.key === "ArrowLeft") player.position.x -= speed;
    if (event.key === "ArrowRight") player.position.x += speed;

    socket.emit("move", { x: player.position.x, y: player.position.y, z: player.position.z });
});

// Bắn đạn
const bullets = [];
document.addEventListener("click", () => {
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.set(player.position.x, player.position.y, player.position.z);
    bullets.push(bullet);
    scene.add(bullet);

    socket.emit("shoot", { x: bullet.position.x, y: bullet.position.y, z: bullet.position.z });
});

// Nhận đạn từ server
socket.on("spawnBullet", (bulletData) => {
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.set(bulletData.x, bulletData.y, bulletData.z);
    bullets.push(bullet);
    scene.add(bullet);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    bullets.forEach((bullet) => {
        bullet.position.z -= 0.2;
    });
    renderer.render(scene, camera);
}
animate();
