// Main application entry point
import { initThreeJS, getScene, getCamera } from './three-setup.js';
import { World } from './ecs/core/index.js';
import { RenderSystem, TransformLoggerSystem } from './ecs/systems/index.js';

import * as THREE from '../modules/three.module.js';


// Initialize the ECS world
const world = new World();

// Initialize modules
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Three.js
    initThreeJS();
    const scene = getScene();
    const camera = getCamera(); // Added for completeness, though not directly used in color logic yet

    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new TransformLoggerSystem(scene));

  

    // Main animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems
        world.update(performance.now() / 1000);
        
    }
    
    // Start the animation loop
    animate();
});
