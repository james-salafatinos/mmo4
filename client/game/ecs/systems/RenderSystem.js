// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from '/shared/core/index.js';
import { render } from '../../three-setup.js';


/**
 * Render System
 * Handles rendering entities with mesh and transform components
 */
export class RenderSystem extends System {
    constructor(scene) {
        super();
        this.requiredComponents = ['TransformComponent'];
        this.scene = scene;
      
    }

    /**
     * Initialize the system, adding all meshes to the scene
     * @param {World} world - The world this system belongs to
     */
    init(world) {

        for (const entity of world.entities) {
            if (this.matchesEntity(entity)) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh && !meshComponent.addedToScene) {
                    this.scene.add(meshComponent.mesh);
                    meshComponent.addedToScene = true;
                }
            }
        }
        console.log("RenderSystem: Initialized");
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     */
    processEntity(entity) {
        const meshComponent = entity.getComponent('MeshComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        
        // Skip if no mesh
        if (!meshComponent.mesh) return;
        
        // Add to scene if not already added
        if (!meshComponent.addedToScene) {
            this.scene.add(meshComponent.mesh);
            meshComponent.addedToScene = true;
        }
        
        // Update mesh transform
        meshComponent.mesh.position.copy(transformComponent.position);
        meshComponent.mesh.rotation.copy(transformComponent.rotation);
        meshComponent.mesh.scale.copy(transformComponent.scale);

 
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     */
    update(world) {
        // Check for deactivated entities with meshes and remove them from the scene
        for (const entity of world.entities) {
            if (!entity.active && entity.hasComponent('MeshComponent')) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh && meshComponent.addedToScene) {
                    // Remove from scene
                    this.scene.remove(meshComponent.mesh);
                    meshComponent.addedToScene = false;
                   
                }
            }
        }
        
        // Process all matching entities
        super.update(world);
        
        // Render the scene
        render();
    }
}
