// Main application entry point
import { initThreeJS, getScene, getCamera, render } from './three-setup.js';
import { World } from '/shared/core/index.js';
import { RenderSystem, TransformLoggerSystem } from './ecs/systems/index.js';
import io from 'https://cdn.socket.io/4.4.1/socket.io.esm.min.js';


// Initialize the ECS world
const world = new World({name:"ClientWorld"});
console.log("[app.js] Established ClientWorld ", world);

// Initialize modules
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Three.js
    initThreeJS();
    const scene = getScene();
    const camera = getCamera(); // Added for completeness, though not directly used in color logic yet

    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new TransformLoggerSystem(scene));

  

    // Connect to the server via Socket.IO
    const socket = io();
    
    // Store the last server state
    let lastServerState = null;
    
    // Listen for server updates (every 300ms)
    socket.on('server_tick', (serverState) => {
        console.log('Received server tick:', serverState);
        lastServerState = serverState;
        
       
    });
    
    // Client-side animation loop (runs at browser frame rate)
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems (client-side prediction/interpolation)
        world.update(performance.now() / 1000);
        
        // Render the scene
        render();
    }
    
    // Start the animation loop
    animate();
    
  
});
