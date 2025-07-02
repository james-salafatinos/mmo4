import * as THREE from '../../../modules/three.module.js';

/**
 * Entity Class
 * Entities are containers for components
 */
export class Entity {
    /**
     * Create a new entity
     * @param {string} [name] - Optional name for the entity
     */
    constructor(name = '') {
        this.id = Entity.nextId++;
        this.name = name || `entity_${this.id}`;
        this.components = new Map();
        this.active = true;
        this.tags = new Set();
        this.world = null; // Reference to parent world when added
        this.networkId = null; // For networked entities
        this.parent = null; // For hierarchical entities
        this.children = new Set(); // Child entities
    }

    /**
     * Add a component to this entity
     * @param {Component} component - The component to add
     * @returns {Entity} This entity for chaining
     */
    addComponent(component) {
        const componentName = component.constructor.name;
        
        // If replacing a component, clean up the old one first
        if (this.components.has(componentName)) {
            const oldComponent = this.components.get(componentName);
            // Call onRemove if it exists
            if (typeof oldComponent.onRemove === 'function') {
                oldComponent.onRemove(this);
            }
        }
        
        this.components.set(componentName, component);
        
        // Call onAdd if it exists
        if (typeof component.onAdd === 'function') {
            component.onAdd(this);
        }
        
        // Notify world of component change if entity is in a world
        if (this.world) {
            this.world.onComponentAdded(this, componentName, component);
        }
        
        return this;
    }

    /**
     * Remove a component from this entity
     * @param {string} componentName - The name of the component class to remove
     * @returns {Entity} This entity for chaining
     */
    removeComponent(componentName) {
        if (this.components.has(componentName)) {
            const component = this.components.get(componentName);
            
            // Call onRemove if it exists
            if (typeof component.onRemove === 'function') {
                component.onRemove(this);
            }
            
            this.components.delete(componentName);
            
            // Notify world of component change if entity is in a world
            if (this.world) {
                this.world.onComponentRemoved(this, componentName, component);
            }
        }
        return this;
    }

    /**
     * Check if this entity has a component
     * @param {string} componentName - The name of the component class to check
     * @returns {boolean} True if the entity has the component
     */
    hasComponent(componentName) {
        return this.components.has(componentName);
    }

    /**
     * Check if this entity has all the specified components
     * @param {Array<string>} componentNames - Array of component names to check
     * @returns {boolean} True if the entity has all components
     */
    hasAllComponents(componentNames) {
        return componentNames.every(name => this.components.has(name));
    }

    /**
     * Get a component from this entity
     * @param {string} componentName - The name of the component class to get
     * @returns {Component|null} The component, or null if not found
     */
    getComponent(componentName) {
        return this.components.get(componentName) || null;
    }
    
    /**
     * Add a tag to this entity
     * @param {string} tag - The tag to add
     * @returns {Entity} This entity for chaining
     */
    addTag(tag) {
        this.tags.add(tag);
        if (this.world) {
            this.world.onTagAdded(this, tag);
        }
        return this;
    }
    
    /**
     * Remove a tag from this entity
     * @param {string} tag - The tag to remove
     * @returns {Entity} This entity for chaining
     */
    removeTag(tag) {
        if (this.tags.has(tag)) {
            this.tags.delete(tag);
            if (this.world) {
                this.world.onTagRemoved(this, tag);
            }
        }
        return this;
    }
    
    /**
     * Check if this entity has a tag
     * @param {string} tag - The tag to check
     * @returns {boolean} True if the entity has the tag
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    /**
     * Add a child entity to this entity
     * @param {Entity} childEntity - The child entity to add
     * @returns {Entity} This entity for chaining
     */
    addChild(childEntity) {
        if (childEntity.parent) {
            childEntity.parent.removeChild(childEntity);
        }
        
        this.children.add(childEntity);
        childEntity.parent = this;
        
        return this;
    }
    
    /**
     * Remove a child entity from this entity
     * @param {Entity} childEntity - The child entity to remove
     * @returns {Entity} This entity for chaining
     */
    removeChild(childEntity) {
        if (this.children.has(childEntity)) {
            this.children.delete(childEntity);
            childEntity.parent = null;
        }
        return this;
    }

    /**
     * Deactivate this entity
     * @param {boolean} cleanup - Whether to clean up resources like meshes
     */
    deactivate(cleanup = true) {
        if (this.active === false) return; // Already deactivated
        
        // Clean up Three.js resources
        if (cleanup && this.hasComponent('MeshComponent')) {
            const meshComponent = this.getComponent('MeshComponent');
            if (meshComponent.mesh) {
                // Remove from parent (scene) if it has one
                if (meshComponent.mesh.parent) {
                    meshComponent.mesh.parent.remove(meshComponent.mesh);
                }
                
                // Dispose of geometry and materials to prevent memory leaks
                if (meshComponent.mesh.geometry) {
                    meshComponent.mesh.geometry.dispose();
                }
                
                if (meshComponent.mesh.material) {
                    if (Array.isArray(meshComponent.mesh.material)) {
                        meshComponent.mesh.material.forEach(material => material.dispose());
                    } else {
                        meshComponent.mesh.material.dispose();
                    }
                }
                
                // Mark as removed from scene
                meshComponent.addedToScene = false;
            }
        }
        
        // Deactivate all children
        if (this.children.size > 0) {
            for (const child of this.children) {
                child.deactivate(cleanup);
            }
        }
        
        // Notify components of deactivation
        for (const [_, component] of this.components) {
            if (typeof component.onDeactivate === 'function') {
                component.onDeactivate(this);
            }
        }
        
        // Mark as inactive
        this.active = false;
        
        // Notify world if entity is in a world
        if (this.world) {
            this.world.onEntityDeactivated(this);
        }
    }
    
    /**
     * Serialize this entity to a plain object
     * @param {boolean} [includeComponents=true] - Whether to include component data
     * @returns {Object} Serialized entity data
     */
    serialize(includeComponents = true) {
        const data = {
            id: this.id,
            name: this.name,
            active: this.active,
            tags: Array.from(this.tags),
            networkId: this.networkId
        };
        
        // Include components if requested
        if (includeComponents) {
            data.components = {};
            for (const [name, component] of this.components) {
                if (typeof component.serialize === 'function') {
                    data.components[name] = component.serialize();
                }
            }
        }
        
        return data;
    }
    
    /**
     * Deserialize data into this entity
     * @param {Object} data - Data to deserialize
     * @param {boolean} [includeComponents=true] - Whether to deserialize component data
     * @returns {Entity} This entity for chaining
     */
    deserialize(data, includeComponents = true) {
        if (!data) return this;
        
        // Basic properties
        if (data.name) this.name = data.name;
        if (data.active !== undefined) this.active = data.active;
        if (data.networkId) this.networkId = data.networkId;
        
        // Tags
        if (data.tags && Array.isArray(data.tags)) {
            this.tags = new Set(data.tags);
        }
        
        // Components
        if (includeComponents && data.components) {
            for (const componentName in data.components) {
                // If we already have this component, update it
                if (this.hasComponent(componentName)) {
                    const component = this.getComponent(componentName);
                    if (typeof component.deserialize === 'function') {
                        component.deserialize(data.components[componentName]);
                    }
                }
                // Otherwise try to create it if registered
                else if (typeof Component !== 'undefined' && Component.types.has(componentName)) {
                    const component = Component.create(componentName, data.components[componentName]);
                    this.addComponent(component);
                }
            }
        }
        
        return this;
    }
}

// Static counter for entity IDs
Entity.nextId = 0;

/**
 * Create an entity from serialized data
 * @param {Object} data - Serialized entity data
 * @returns {Entity} New entity instance
 */
Entity.fromJSON = function(data) {
    const entity = new Entity(data.name || '');
    return entity.deserialize(data);
};
