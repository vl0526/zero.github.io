import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.140.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.140.0/examples/jsm/loaders/GLTFLoader.js";

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Nhân vật Minecraft
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Mặt đất
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Điều khiển góc nhìn bằng chuột
document.addEventListener("click", () => {
    document.body.requestPointerLock();
});

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement) {
        player.rotation.y -= event.movementX * 0.002;
    }
});

// Di chuyển WASD
const speed = 0.1;
const keys = {};
document.addEventListener("keydown", (event) => keys[event.key] = true);
document.addEventListener("keyup", (event) => keys[event.key] = false);

function updatePlayer() {
    if (keys["w"]) player.position.z -= speed;
    if (keys["s"]) player.position.z += speed;
    if (keys["a"]) player.position.x -= speed;
    if (keys["d"]) player.position.x += speed;
}

// Thêm súng
const loader = new GLTFLoader();
let gun;
loader.load("gun_model.glb", (gltf) => {
    gun = gltf.scene;
    gun.position.set(0.5, 1.5, -1);
    player.add(gun);
});

// Xử lý bắn đạn
const bullets = [];
document.addEventListener("mousedown", () => {
    if (!gun) return;
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.set(player.position.x, player.position.y + 1, player.position.z);
    bullets.push(bullet);
    scene.add(bullet);
});

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.position.z -= 0.5;
        if (bullet.position.z < -25) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });
}

// Zombie AI
const zombieGeometry = new THREE.BoxGeometry(1, 2, 1);
const zombieMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

const zombies = [];
function spawnZombie() {
    const zombie = new THREE.Mesh(zombieGeometry, zombieMaterial);
    zombie.position.set(Math.random() * 20 - 10, 1, -20);
    zombies.push(zombie);
    scene.add(zombie);
}
setInterval(spawnZombie, 3000); // Cứ 3 giây spawn 1 zombie

function updateZombies() {
    zombies.forEach((zombie, index) => {
        const direction = new THREE.Vector3(
            player.position.x - zombie.position.x,
            0,
            player.position.z - zombie.position.z
        ).normalize();
        zombie.position.add(direction.multiplyScalar(0.05));

        // Nếu chạm vào người chơi → trừ máu
        if (zombie.position.distanceTo(player.position) < 1.5) {
            playerHealth -= 1;
            if (playerHealth <= 0) {
                playerHealth = 100;
                player.position.set(0, 1, 0);
            }
        }

        // Nếu bị bắn trúng → biến mất
        bullets.forEach((bullet, bulletIndex) => {
            if (zombie.position.distanceTo(bullet.position) < 1) {
                scene.remove(zombie);
                zombies.splice(index, 1);
                scene.remove(bullet);
                bullets.splice(bulletIndex, 1);
            }
        });
    });
}

// Thanh máu
let playerHealth = 100;
const healthBar = document.createElement("div");
healthBar.style.position = "absolute";
healthBar.style.top = "10px";
healthBar.style.left = "10px";
healthBar.style.width = "200px";
healthBar.style.height = "20px";
healthBar.style.background = "red";
document.body.appendChild(healthBar);

function updateHealth() {
    healthBar.style.width = playerHealth + "%";
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    updateBullets();
    updateZombies();
    updateHealth();
    renderer.render(scene, camera);
}
animate();
