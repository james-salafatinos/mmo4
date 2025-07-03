/**
 * World Class
 * The world manages entities and systems
 */
export class World {
    /**
     * Create a new world
     * @param {Object} [config] - Optional configuration
     */
    constructor(config = {}) {
        this.entities = [];
        this.systems = [];
        this.lastUpdateTime = 0;
        this.running = false;
        this.name = config.name || 'World';

        // Entity lookup maps for faster access
        this.entitiesById = new Map();
        this.entitiesByTag = new Map();
        this.entitiesByComponent = new Map();

        // Event system
        this.eventListeners = new Map();

        // Spatial partitioning (for MMORPG optimization)
        this.useSpatialPartitioning = config.useSpatialPartitioning !== false;
        this.spatialGrid = null;
        this.spatialGridCellSize = config.spatialGridCellSize || 50;

        if (this.useSpatialPartitioning) {
            this.initSpatialPartitioning();
        }
    }

    /**
     * Initialize spatial partitioning grid
     * @private
     */
    initSpatialPartitioning() {
        // Simple grid-based spatial partitioning
        this.spatialGrid = new Map();
    }

    /**
     * Add an entity to this world
     * @param {Entity} entity - The entity to add
     * @returns {Entity} The added entity
     */
    addEntity(entity) {
        // Skip if already in this world
        if (entity.world === this) return entity;

        // Remove from previous world if any
        if (entity.world) {
            entity.world.removeEntity(entity);
        }

        // Add to entities array
        this.entities.push(entity);

        // Set world reference
        entity.world = this;

        // Add to lookup maps
        this.entitiesById.set(entity.id, entity);

        // Add to component map
        for (const [componentName, _] of entity.components) {
            if (!this.entitiesByComponent.has(componentName)) {
                this.entitiesByComponent.set(componentName, new Set());
            }
            this.entitiesByComponent.get(componentName).add(entity);
        }

        // Add to tag map
        for (const tag of entity.tags) {
            if (!this.entitiesByTag.has(tag)) {
                this.entitiesByTag.set(tag, new Set());
            }
            this.entitiesByTag.get(tag).add(entity);
        }

        // Add to spatial grid if applicable
        if (this.useSpatialPartitioning && entity.hasComponent('TransformComponent')) {
            this.updateEntityInSpatialGrid(entity);
        }

        // Notify systems
        for (const system of this.systems) {
            if (system.onEntityAdded) {
                system.onEntityAdded(entity);
            }
        }

        // Emit event
        this.emit('entityAdded', entity);

        return entity;
    }

    /**
     * Remove an entity from this world
     * @param {Entity} entity - The entity to remove
     */
    removeEntity(entity) {
        // Skip if not in this world
        if (entity.world !== this) return;

        // Emit event before removal
        this.emit('entityRemoved', entity);

        // Notify systems
        for (const system of this.systems) {
            if (system.onEntityRemoved) {
                system.onEntityRemoved(entity);
            }
        }

        // Remove from lookup maps
        this.entitiesById.delete(entity.id);

        // Remove from component map
        for (const [componentName, _] of entity.components) {
            if (this.entitiesByComponent.has(componentName)) {
                this.entitiesByComponent.get(componentName).delete(entity);
            }
        }

        // Remove from tag map
        for (const tag of entity.tags) {
            if (this.entitiesByTag.has(tag)) {
                this.entitiesByTag.get(tag).delete(entity);
            }
        }

        // Remove from spatial grid
        if (this.useSpatialPartitioning && entity.hasComponent('TransformComponent')) {
            this.removeEntityFromSpatialGrid(entity);
        }

        // Remove from entities array
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }

        // Clear world reference
        entity.world = null;
    }

    /**
     * Register a system with this world
     * @param {System} system - The system to register
     * @returns {System} The registered system for chaining
     */
    registerSystem(system) {
        // Skip if already registered
        if (this.systems.includes(system)) return system;

        this.systems.push(system);

        // Sort systems by priority (higher priority runs first)
        this.systems.sort((a, b) => b.priority - a.priority);

        // Initialize the system if world is already initialized
        if (this.running && system.init) {
            system.init(this);
        }

        // Emit event
        this.emit('systemRegistered', system);

        return system;
    }

    /**
     * Unregister a system from this world
     * @param {System} system - The system to unregister
     */
    unregisterSystem(system) {
        const index = this.systems.indexOf(system);
        if (index !== -1) {
            this.systems.splice(index, 1);
            this.emit('systemUnregistered', system);
        }
    }

    /**
     * Initialize all systems and start the world
     */
    init() {
        if (this.running) return;

        // Initialize spatial partitioning if needed
        if (this.useSpatialPartitioning && !this.spatialGrid) {
            this.initSpatialPartitioning();
        }

        // Initialize all systems
        for (const system of this.systems) {
            if (system.init) {
                system.init(this);
            }
        }

        this.running = true;
        this.emit('worldStarted', this);
    }

    /**
     * Update all systems in this world
     * @param {number} currentTime - Current time in seconds
     */
    update(currentTime) {
        if (!this.running) return;

        const deltaTime = this.lastUpdateTime === 0 ?
            0 : currentTime - this.lastUpdateTime;

        // Pre-update hook
        this.emit('preUpdate', deltaTime);

        // Update all systems
        for (const system of this.systems) {
            if (system.enabled) {
                system.update(this, deltaTime, currentTime);
            }
        }

        // Clean up deactivated entities
        const deactivatedEntities = this.entities.filter(entity => !entity.active);
        for (const entity of deactivatedEntities) {
            this.removeEntity(entity);
        }

        // Post-update hook
        this.emit('postUpdate', deltaTime);

        // Update time
        this.lastUpdateTime = currentTime;
    }

    /**
     * Stop the world
     */
    stop() {
        if (!this.running) return;

        this.running = false;
        this.emit('worldStopped', this);
    }


    /**
     * Find entities with a specific component type
     * @param {string} componentName - Component class name to find
     * @returns {Array<Entity>} - Array of entities having that component
     */
    findEntitiesWith(componentName) {
        // Use the component map for O(1) lookup instead of filtering all entities
        if (this.entitiesByComponent.has(componentName)) {
            // Convert Set to Array and filter for active entities
            return Array.from(this.entitiesByComponent.get(componentName))
                .filter(entity => entity.active);
        }
        return [];
    }

    /**
     * Find entities with a specific tag
     * @param {string} tag - Tag to find
     * @returns {Array<Entity>} - Array of entities having that tag
     */
    findEntitiesWithTag(tag) {
        // Use the tag map for O(1) lookup
        if (this.entitiesByTag.has(tag)) {
            return Array.from(this.entitiesByTag.get(tag))
                .filter(entity => entity.active);
        }
        return [];
    }

    /**
     * Get an entity by its ID
     * @param {number} id - Entity ID to find
     * @returns {Entity|null} - Matching entity or null
     */
    getEntityById(id) {
        // Use the ID map for O(1) lookup
        const entity = this.entitiesById.get(id);
        return (entity && entity.active) ? entity : null;
    }

    /**
     * Get an entity by its network ID
     * @param {string} networkId - Network ID to find
     * @returns {Entity|null} - Matching entity or null
     */
    getEntityByNetworkId(networkId) {
        return this.entities.find(entity =>
            entity.active && entity.networkId === networkId
        ) || null;
    }

    /**
     * Find the first entity with specific component type
     * @param {string} componentName - Component class name to find
     * @returns {Entity|null} - First matching entity or null
     */
    findEntityWith(componentName) {
        // Use the component map for faster lookup
        if (this.entitiesByComponent.has(componentName)) {
            for (const entity of this.entitiesByComponent.get(componentName)) {
                if (entity.active) return entity;
            }
        }
        return null;
    }

    /**
     * Find entities that have all the specified component types
     * @param {Array<string>} componentNames - Array of component names
     * @returns {Array<Entity>} - Array of entities with all component types
     */
    queryEntities(componentNames) {
        if (!componentNames || componentNames.length === 0) {
            return [];
        }

        // Start with the smallest component set for better performance
        let smallestSet = null;
        let smallestSize = Infinity;

        for (const componentName of componentNames) {
            if (this.entitiesByComponent.has(componentName)) {
                const set = this.entitiesByComponent.get(componentName);
                if (set.size < smallestSize) {
                    smallestSet = set;
                    smallestSize = set.size;
                }
            } else {
                // If any component type has no entities, return empty array
                return [];
            }
        }

        if (!smallestSet) return [];

        // Filter the smallest set by checking other components
        return Array.from(smallestSet)
            .filter(entity =>
                entity.active &&
                componentNames.every(name => entity.hasComponent(name))
            );
    }

    /**
     * Handle a component being added to an entity
     * @param {Entity} entity The entity
     * @param {string} componentName The name of the component
     */
    onComponentAdded(entity, componentName) {
        if (!this.entitiesByComponent.has(componentName)) {
            this.entitiesByComponent.set(componentName, new Set());
        }
        this.entitiesByComponent.get(componentName).add(entity);

        for (const system of this.systems) {
            if (system.onComponentAdded) {
                system.onComponentAdded(entity, componentName);
            }
        }
    }

    /**
     * Handle a component being removed from an entity
     * @param {Entity} entity The entity
     * @param {string} componentName The name of the component
     */
    onComponentRemoved(entity, componentName) {
        if (this.entitiesByComponent.has(componentName)) {
            this.entitiesByComponent.get(componentName).delete(entity);
        }

        for (const system of this.systems) {
            if (system.onComponentRemoved) {
                system.onComponentRemoved(entity, componentName);
            }
        }
    }

    /**
     * Handle a tag being added to an entity
     * @param {Entity} entity The entity
     * @param {string} tag The tag
     */
    onTagAdded(entity, tag) {
        if (!this.entitiesByTag.has(tag)) {
            this.entitiesByTag.set(tag, new Set());
        }
        this.entitiesByTag.get(tag).add(entity);

        for (const system of this.systems) {
            if (system.onTagAdded) {
                system.onTagAdded(entity, tag);
            }
        }
    }

    /**
     * Handle a tag being removed from an entity
     * @param {Entity} entity The entity
     * @param {string} tag The tag
     */
    onTagRemoved(entity, tag) {
        if (this.entitiesByTag.has(tag)) {
            this.entitiesByTag.get(tag).delete(entity);
        }

        for (const system of this.systems) {
            if (system.onTagRemoved) {
                system.onTagRemoved(entity, tag);
            }
        }
    }
    
    /**
     * Handle an entity being deactivated
     * @param {Entity} entity The entity
     */
    onEntityDeactivated(entity) {
        // The main update loop handles removal of deactivated entities.
        // Systems are notified of removal when the entity is fully removed.
        // This hook is here in case any system needs to react immediately to deactivation.
        for (const system of this.systems) {
            if (system.onEntityDeactivated) {
                system.onEntityDeactivated(entity);
            }
        }
    }

    /**
     * Register an event listener
     * @param {string} eventName - The name of the event
     * @param {Function} listener - The callback function
     */
    on(eventName, listener) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(listener);
    }

    /**
     * Unregister an event listener
     * @param {string} eventName - The name of the event
     * @param {Function} listener - The callback function
     */
    off(eventName, listener) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - The name of the event
     * @param  {...any} args - Arguments to pass to the listener
     */
    emit(eventName, ...args) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            for (const listener of listeners) {
                listener(...args);
            }
        }
    }
}