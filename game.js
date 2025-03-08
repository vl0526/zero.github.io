// Create the scene
const scene = new THREE.Scene();

// Set up the camera
const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.z = 5; // Move camera back to view the model

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add a basic light to illuminate the model
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

// Initialize the GLTFLoader
const loader = new THREE.GLTFLoader();

// Load a GLTF model (replace the URL with your model's path)
loader.load(
    'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf', // Example model
    function (gltf) {
        // On successful load, add the model to the scene
        const model = gltf.scene;
        scene.add(model);

        // Optional: Center and scale the model if needed
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
    },
    function (xhr) {
        // Progress callback (optional)
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        // Error callback
        console.error('An error occurred while loading the model:', error);
    }
);

// Animation loop to render the scene
function animate() {
    requestAnimationFrame(animate);

    // Optional: Rotate the model for a dynamic effect
    if (scene.children.length > 1) { // Check if model is loaded
        scene.children[1].rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
