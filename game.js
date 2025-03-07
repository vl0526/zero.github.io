import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.140.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three/examples/jsm/loaders/GLTFLoader.js";

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let playerHealth = 100;

// Player
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Mặt đất
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.DoubleSide }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

camera.position.set(0, 5, 10);
camera.lookAt(player.position);

// Điều khiển chuột
document.addEventListener("click", () => {
    document.body.requestPointerLock();
});

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement) {
        player.rotation.y -= event.movementX * 0.002;
    }
});

// Di chuyển
const keys = {};
document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));

function movePlayer() {
    const speed = 0.2;
    if (keys["w"]) player.position.z -= speed;
    if (keys["s"]) player.position.z += speed;
    if (keys["a"]) player.position.x -= speed;
    if (keys["d"]) player.position.x += speed;
}

// Đạn
const bullets = [];
document.addEventListener("mousedown", () => {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    bullet.position.copy(player.position);
    bullets.push(bullet);
    scene.add(bullet);
});

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.position.z -= 0.5;
        if (bullet.position.z < -50) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });
}

// Zombie
const zombies = [];
function spawnZombie() {
    const zombie = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    zombie.position.set(Math.random() * 20 - 10, 1, -20);
    zombies.push(zombie);
    scene.add(zombie);
}
setInterval(spawnZombie, 5000);

function updateZombies() {
    zombies.forEach((zombie, index) => {
        const direction = player.position.clone().sub(zombie.position).normalize();
        zombie.position.add(direction.multiplyScalar(0.05));

        if (zombie.position.distanceTo(player.position) < 1.5) {
            playerHealth -= 1;
            document.getElementById("health").style.width = playerHealth + "%";
            if (playerHealth <= 0) {
                player.position.set(0, 1, 0);
                playerHealth = 100;
                document.getElementById("health").style.width = "100%";
            }
        }

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

function animate() {
    requestAnimationFrame(animate);
    movePlayer();
    updateBullets();
    updateZombies();
    renderer.render(scene, camera);
}
animate();
