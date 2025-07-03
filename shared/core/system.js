/**
 * System Base Class
 * Systems contain logic that operates on entities with specific components
 */
export class System {
    /**
     * Create a new system
     * @param {Object} [config] - Optional configuration
     * @param {Array<string>} [config.requiredComponents=[]] - Component types required for entities
     * @param {Array<string>} [config.requiredTags=[]] - Tags required for entities
     * @param {Array<string>} [config.excludedComponents=[]] - Component types that exclude entities
     * @param {Array<string>} [config.excludedTags=[]] - Tags that exclude entities
     * @param {number} [config.priority=0] - Execution priority (higher runs first)
     * @param {boolean} [config.enabled=true] - Whether the system is enabled
     */
    constructor(config = {}) {
        this.requiredComponents = config.requiredComponents || [];
        this.requiredTags = config.requiredTags || [];
        this.excludedComponents = config.excludedComponents || [];
        this.excludedTags = config.excludedTags || [];
        this.priority = config.priority || 0;
        this.enabled = config.enabled !== undefined ? config.enabled : true;
        this.world = null;
        this.entities = new Set(); // Cached matching entities
        this.initialized = false;
        this.lastUpdateTime = 0;
        this.fixedTimeStep = null; // For fixed time step updates
        this.accumulator = 0; // For fixed time step updates
        this.name = this.constructor.name;
    }

    /**
     * Check if an entity matches this system's requirements
     * @param {Entity} entity - The entity to check
     * @returns {boolean} True if the entity matches system requirements
     */
    matchesEntity(entity) {
        // Must have all required components
        if (!this.requiredComponents.every(componentName => entity.hasComponent(componentName))) {
            return false;
        }
        
        // Must have all required tags
        if (!this.requiredTags.every(tag => entity.hasTag(tag))) {
            return false;
        }
        
        // Must not have any excluded components
        if (this.excludedComponents.some(componentName => entity.hasComponent(componentName))) {
            return false;
        }
        
        // Must not have any excluded tags
        if (this.excludedTags.some(tag => entity.hasTag(tag))) {
            return false;
        }
        
        return true;
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        // Override in derived classes
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} currentTime - Current time in seconds
     */
    update(world, deltaTime, currentTime) {
        if (!this.enabled) return;
        
        this.world = world; // Cache reference to world
        
        // Handle fixed time step if configured
        if (this.fixedTimeStep !== null) {
            this.accumulator += deltaTime;
            
            while (this.accumulator >= this.fixedTimeStep) {
                this.updateEntities(this.fixedTimeStep);
                this.accumulator -= this.fixedTimeStep;
            }
        } else {
            this.updateEntities(deltaTime);
        }
        
        this.lastUpdateTime = currentTime;
    }
    
    /**
     * Process all matching entities
     * @param {number} deltaTime - Time step in seconds
     */
    updateEntities(deltaTime) {
        // Pre-update hook
        this.preUpdate(deltaTime);
        
        // Process each entity
        for (const entity of this.entities) {
            if (entity.active) {
                this.processEntity(entity, deltaTime);
            }
        }
        
        // Post-update hook
        this.postUpdate(deltaTime);
    }
    
    /**
     * Called before processing entities
     * @param {number} deltaTime - Time step in seconds
     */
    preUpdate(deltaTime) {
        // Override in derived classes if needed
    }
    
    /**
     * Called after processing entities
     * @param {number} deltaTime - Time step in seconds
     */
    postUpdate(deltaTime) {
        // Override in derived classes if needed
    }

    /**
     * Initialize the system
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        this.world = world;
        this.initialized = true;
        
        // Find all matching entities and cache them
        this.refreshEntityCache();
        
        // System-specific initialization
        this.onInit();
    }
    
    /**
     * System-specific initialization
     * Override in derived classes
     */
    onInit() {
        // Override in derived classes
    }
    
    /**
     * Refresh the cached list of matching entities
     */
    refreshEntityCache() {
        this.entities.clear();
        
        for (const entity of this.world.entities) {
            if (entity.active && this.matchesEntity(entity)) {
                this.entities.add(entity);
            }
        }
    }
    
    /**
     * Handle a new entity that was added to the world
     * @param {Entity} entity - The entity that was added
     */
    onEntityAdded(entity) {
        if (entity.active && this.matchesEntity(entity)) {
            this.entities.add(entity);
            this.onEntityMatched(entity);
        }
    }
    
    /**
     * Handle an entity that was removed from the world
     * @param {Entity} entity - The entity that was removed
     */
    onEntityRemoved(entity) {
        if (this.entities.has(entity)) {
            this.entities.delete(entity);
            this.onEntityUnmatched(entity);
        }
    }
    
    /**
     * Handle an entity that was modified and now matches this system
     * @param {Entity} entity - The entity that now matches
     */
    onEntityMatched(entity) {
        // Override in derived classes if needed
    }
    
    /**
     * Handle an entity that was modified and no longer matches this system
     * @param {Entity} entity - The entity that no longer matches
     */
    onEntityUnmatched(entity) {
        // Override in derived classes if needed
    }
    
    /**
     * Handle a component that was added to an entity
     * @param {Entity} entity - The entity that had a component added
     * @param {string} componentName - The name of the component that was added
     */
    onComponentAdded(entity, componentName) {
        const wasMatched = this.entities.has(entity);
        const nowMatches = this.matchesEntity(entity);
        
        if (!wasMatched && nowMatches) {
            this.entities.add(entity);
            this.onEntityMatched(entity);
        } else if (wasMatched && !nowMatches) {
            this.entities.delete(entity);
            this.onEntityUnmatched(entity);
        }
    }
    
    /**
     * Handle a component that was removed from an entity
     * @param {Entity} entity - The entity that had a component removed
     * @param {string} componentName - The name of the component that was removed
     */
    onComponentRemoved(entity, componentName) {
        const wasMatched = this.entities.has(entity);
        const nowMatches = this.matchesEntity(entity);
        
        if (!wasMatched && nowMatches) {
            this.entities.add(entity);
            this.onEntityMatched(entity);
        } else if (wasMatched && !nowMatches) {
            this.entities.delete(entity);
            this.onEntityUnmatched(entity);
        }
    }
    
    /**
     * Handle a tag that was added to an entity
     * @param {Entity} entity - The entity that had a tag added
     * @param {string} tag - The tag that was added
     */
    onTagAdded(entity, tag) {
        const wasMatched = this.entities.has(entity);
        const nowMatches = this.matchesEntity(entity);
        
        if (!wasMatched && nowMatches) {
            this.entities.add(entity);
            this.onEntityMatched(entity);
        }
    }
    
    /**
     * Handle a tag that was removed from an entity
     * @param {Entity} entity - The entity that had a tag removed
     * @param {string} tag - The tag that was removed
     */
    onTagRemoved(entity, tag) {
        const wasMatched = this.entities.has(entity);
        const nowMatches = this.matchesEntity(entity);
        
        if (wasMatched && !nowMatches) {
            this.entities.delete(entity);
            this.onEntityUnmatched(entity);
        }
    }
    
    /**
     * Set the system to use a fixed time step
     * @param {number} timeStep - Fixed time step in seconds
     */
    setFixedTimeStep(timeStep) {
        this.fixedTimeStep = timeStep;
        this.accumulator = 0;
    }
    
    /**
     * Enable this system
     */
    enable() {
        this.enabled = true;
    }
    
    /**
     * Disable this system
     */
    disable() {
        this.enabled = false;
    }
}
