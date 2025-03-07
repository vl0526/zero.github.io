import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.140.0/build/three.module.js";

// Tạo Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Tạo mặt đất
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Tạo nhân vật (hình hộp vuông)
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Cấu hình camera
camera.position.set(0, 5, 10);
camera.lookAt(player.position);

// Điều khiển nhân vật
const speed = 0.2;
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") player.position.z -= speed;
    if (event.key === "ArrowDown") player.position.z += speed;
    if (event.key === "ArrowLeft") player.position.x -= speed;
    if (event.key === "ArrowRight") player.position.x += speed;
});

// Vòng lặp render
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
