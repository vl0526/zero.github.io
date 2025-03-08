// Khởi tạo scene, camera và renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10); // Đặt camera phía sau xe
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Thêm ánh sáng
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Ánh sáng môi trường
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Ánh sáng định hướng
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Tải model xe mô tô
const loader = new THREE.GLTFLoader();
let bike;
loader.load('path/to/bike.glb', (gltf) => {
    bike = gltf.scene;
    bike.position.set(0, 0.5, 0); // Đặt xe trên mặt đất
    scene.add(bike);
});

// Tạo mặt đất
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Xoay mặt đất nằm ngang
scene.add(ground);

// Thêm cây cối
const treeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 32);
const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const tree = new THREE.Mesh(treeGeometry, treeMaterial);
tree.position.set(5, 2.5, -5); // Đặt cây trong cảnh
scene.add(tree);

// Biến điều khiển xe
let speed = 0;
let steering = 0;
const maxSpeed = 0.5; // Tốc độ tối đa
const acceleration = 0.01; // Gia tốc
const steeringSpeed = 0.05; // Tốc độ rẽ

// Điều khiển bằng bàn phím
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

// Hàm animate
function animate() {
    requestAnimationFrame(animate); // Render mượt mà
    if (bike) {
        const direction = new THREE.Vector3();
        bike.getWorldDirection(direction); // Lấy hướng xe
        bike.position.addScaledVector(direction, speed); // Di chuyển xe
        bike.rotation.y += steering * speed; // Xoay xe khi rẽ
        camera.position.set(bike.position.x, bike.position.y + 5, bike.position.z + 10); // Camera theo xe
        camera.lookAt(bike.position); // Nhìn vào xe
    }
    renderer.render(scene, camera);
}
animate();
