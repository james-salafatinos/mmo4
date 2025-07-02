import { World, Entity } from '../game/ecs/core/index.js';
import { TransformComponent, InteractableComponent } from '../game/ecs/components/index.js';
import { TransformLoggerSystem } from '../game/ecs/systems/TransformLoggerSystem.js';

// --- Components and Systems for Testing ---

const availableComponents = {
    TransformComponent,
    InteractableComponent
};

const availableSystems = {
    TransformLoggerSystem
};

// --- DOM Elements ---
const createWorldBtn = document.getElementById('create-world-btn');
const worldControls = document.getElementById('world-controls');
const worldNameSpan = document.getElementById('world-name');

const entityDropdown = document.getElementById('entity-dropdown');
const addEntityBtn = document.getElementById('add-entity-btn');

const componentDropdown = document.getElementById('component-dropdown');
const entityTargetDropdown = document.getElementById('entity-target-dropdown');
const addComponentBtn = document.getElementById('add-component-btn');

const systemDropdown = document.getElementById('system-dropdown');
const registerSystemBtn = document.getElementById('register-system-btn');
const runWorldBtn = document.getElementById('run-world-btn');

const logOutput = document.getElementById('log-output');

// --- State ---
let world = null;
let entityCounter = 0;
let gameLoopInterval = null;

// --- Logging ---
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    logOutput.textContent += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// --- Event Listeners ---

createWorldBtn.addEventListener('click', () => {
    world = new World({ name: 'TestWorld' });
    worldNameSpan.textContent = world.name;
    worldControls.classList.remove('hidden');
    createWorldBtn.disabled = true;
    log(`World "${world.name}" created.`);
    checkAddComponentButtonState();
});

addEntityBtn.addEventListener('click', () => {
    if (!world) return;
    const entityType = entityDropdown.value;
    if (!entityType) {
        log('Please select an entity type.');
        return;
    }
    entityCounter++;
    const entity = new Entity(`${entityType}_${entityCounter}`);
    world.addEntity(entity);
    log(`Added entity: ${entity.name} (ID: ${entity.id})`);
    updateEntityTargetDropdown();
});

addComponentBtn.addEventListener('click', () => {
    if (!world) return;
    const componentName = componentDropdown.value;
    const entityId = parseInt(entityTargetDropdown.value, 10);

    if (!componentName || isNaN(entityId)) {
        log('Please select a component and a target entity.');
        return;
    }

    const entity = world.getEntityById(entityId);
    if (!entity) {
        log(`Error: Entity with ID ${entityId} not found.`);
        return;
    }

    const ComponentClass = availableComponents[componentName];
    if (ComponentClass) {
        const component = new ComponentClass();
        entity.addComponent(component);
        log(`Added ${componentName} to ${entity.name}.`);
    } else {
        log(`Error: Component type "${componentName}" not found.`);
    }
});

runWorldBtn.addEventListener('click', () => {
    if (!world) return;

    if (world.running) {
        world.stop();
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
        runWorldBtn.textContent = 'Run World';
        log('World stopped.');
    } else {
        world.init(); // Initialize systems
        const tickRate = 300; // ms
        gameLoopInterval = setInterval(() => {
            const currentTime = performance.now() / 1000; // seconds
            world.update(currentTime);
        }, tickRate);
        runWorldBtn.textContent = 'Stop World';
        log(`World started with a tick rate of ${tickRate}ms.`);
    }
});

registerSystemBtn.addEventListener('click', () => {
    if (!world) return;
    const systemName = systemDropdown.value;
    if (!systemName) {
        log('Please select a system to register.');
        return;
    }

    const SystemClass = availableSystems[systemName];
    if (SystemClass) {
        const system = new SystemClass();
        world.registerSystem(system);
        log(`Registered system: ${systemName}.`);
    } else {
        log(`Error: System type "${systemName}" not found.`);
    }
});

entityTargetDropdown.addEventListener('change', checkAddComponentButtonState);

// --- Helper Functions ---

function updateEntityTargetDropdown() {
    const selected = entityTargetDropdown.value;
    entityTargetDropdown.innerHTML = '<option value="" disabled selected>Select Target Entity</option>';
    world.entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity.name;
        entityTargetDropdown.appendChild(option);
    });
    entityTargetDropdown.value = selected;
    checkAddComponentButtonState();
}

function checkAddComponentButtonState() {
    const hasEntities = world && world.entities.length > 0;
    entityTargetDropdown.disabled = !hasEntities;
    addComponentBtn.disabled = !hasEntities || !entityTargetDropdown.value;
}

// --- Initial Log ---
log('ECS Test Suite Initialized. Click "Create World" to begin.');
