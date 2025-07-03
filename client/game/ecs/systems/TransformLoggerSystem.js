import { System } from '/shared/core/system.js';

export class TransformLoggerSystem extends System {
    constructor() {
        super({ requiredComponents: ['TransformComponent'] });
    }

    processEntity(entity, deltaTime) {
        const transform = entity.getComponent('TransformComponent');
        if (transform && transform.position) {
            const pos = transform.position;
            // The original 'log' function is in the test script.
            // We'll use console.log for the decoupled system.
            console.log(`[TransformLoggerSystem] Entity ${entity.name} is at (${(pos.x || 0).toFixed(2)}, ${(pos.y || 0).toFixed(2)}, ${(pos.z || 0).toFixed(2)})`);
        } else if (transform) {
            console.log(`[TransformLoggerSystem] Entity ${entity.name} has TransformComponent but no position data.`);
        }
    }
}
