const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const bodyGeometry = new THREE.BoxGeometry(2, 1, 0.5);
const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
scene.add(body);

const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
frontWheel.position.set(1, -0.5, 0);
frontWheel.rotation.z = Math.PI / 2;
body.add(frontWheel);
const backWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
backWheel.position.set(-1, -0.5, 0);
backWheel.rotation.z = Math.PI / 2;
body.add(backWheel);

const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const light = new THREE.AmbientLight(0xffffff);
scene.add(light);

let speed = 0;
let steering = 0;
const maxSpeed = 0.5;
const acceleration = 0.01;
const steeringSpeed = 0.05;

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp': speed = Math.min(speed + acceleration, maxSpeed); break;
        case 'ArrowDown': speed = Math.max(speed - acceleration, -maxSpeed); break;
        case 'ArrowLeft': steering = Math.min(steering + steeringSpeed, 1); break;
        case 'ArrowRight': steering = Math.max(steering - steeringSpeed, -1); break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown': speed = 0; break;
        case 'ArrowLeft':
        case 'ArrowRight': steering = 0; break;
    }
});

function animate() {
    requestAnimationFrame(animate);
    const direction = new THREE.Vector3();
    body.getWorldDirection(direction);
    body.position.addScaledVector(direction, speed);
    body.rotation.y += steering * speed;
    camera.position.set(body.position.x, body.position.y + 5, body.position.z + 10);
    camera.lookAt(body.position);
    renderer.render(scene, camera);
}
animate();
