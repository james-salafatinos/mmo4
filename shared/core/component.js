/**
 * Component Base Class
 * Components are pure data containers
 */
export class Component {
    constructor(data = {}) {
        // Initialize with default values
        this.init();
        
        // Apply provided data
        if (data) {
            this.deserialize(data);
        }
    }
    
    /**
     * Initialize component with default values
     * Override in derived classes
     */
    init() {
        // Set default properties here in derived classes
    }
    
    /**
     * Reset component to default state (for object pooling)
     */
    reset() {
        this.init();
    }
    
    /**
     * Serialize component data for network transmission
     * @returns {Object} Serialized data
     */
    serialize() {
        const result = {};
        
        // Get all serializable properties from schema
        const schema = this.constructor.schema;
        if (schema) {
            for (const prop in schema) {
                if (this.hasOwnProperty(prop)) {
                    result[prop] = this[prop];
                }
            }
            return result;
        }
        
        // Fallback: serialize all properties except functions
        for (const prop in this) {
            if (this.hasOwnProperty(prop) && typeof this[prop] !== 'function') {
                result[prop] = this[prop];
            }
        }
        
        return result;
    }
    
    /**
     * Deserialize data into this component
     * @param {Object} data - Data to deserialize
     */
    deserialize(data) {
        if (!data) return;
        
        // Apply data based on schema if available
        const schema = this.constructor.schema;
        if (schema) {
            for (const prop in data) {
                if (schema.hasOwnProperty(prop)) {
                    this[prop] = data[prop];
                }
            }
            return;
        }
        
        // Fallback: deserialize all properties
        Object.assign(this, data);
    }
    
    /**
     * Clone this component
     * @returns {Component} A new component with the same data
     */
    clone() {
        return new this.constructor(this.serialize());
    }
}

// Component type registry
Component.types = new Map();

/**
 * Register a component type
 * @param {string} typeName - Name to register the component as
 * @param {class} componentClass - Component class to register
 */
Component.register = function(typeName, componentClass) {
    Component.types.set(typeName, componentClass);
};

/**
 * Create a component from type name and data
 * @param {string} typeName - Registered component type name
 * @param {Object} data - Component data
 * @returns {Component} New component instance
 */
Component.create = function(typeName, data = {}) {
    const ComponentClass = Component.types.get(typeName);
    if (!ComponentClass) {
        throw new Error(`Component type '${typeName}' not registered`);
    }
    return new ComponentClass(data);
};

/**
 * Component Pool for reusing component instances
 */
export class ComponentPool {
    constructor(ComponentClass) {
        this.ComponentClass = ComponentClass;
        this.pool = [];
    }
    
    /**
     * Get a component from the pool or create a new one
     * @param {Object} data - Initial data
     * @returns {Component} Component instance
     */
    get(data = {}) {
        const component = this.pool.pop() || new this.ComponentClass();
        component.deserialize(data);
        return component;
    }
    
    /**
     * Return a component to the pool
     * @param {Component} component - Component to return
     */
    release(component) {
        if (component instanceof this.ComponentClass) {
            component.reset();
            this.pool.push(component);
        }
    }
    
    /**
     * Clear the pool
     */
    clear() {
        this.pool.length = 0;
    }
}
