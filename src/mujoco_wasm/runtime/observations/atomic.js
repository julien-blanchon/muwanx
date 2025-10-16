/**
 * Atomic observation components that can be composed together.
 * All components support history_steps parameter:
 * - history_steps = 1: returns single timestep (current state)
 * - history_steps > 1: returns temporal history (newest first)
 */
import * as THREE from 'three';

/**
 * Base linear velocity in base frame
 * Dims: 3 * history_steps
 */
export class BaseLinearVelocity {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { history_steps = 1, scale = 1.0 } = kwargs;
        this.steps = history_steps;
        this.scale = scale;
        this.history = new Array(this.steps).fill(null).map(() => new Float32Array(3));
    }

    compute() {
        // Get base quaternion for frame transformation
        const baseQuat = this.simulation.qpos.subarray(3, 7);
        const quat_inv = new THREE.Quaternion(baseQuat[1], baseQuat[2], baseQuat[3], baseQuat[0]).invert();
        
        // Get linear velocity in world frame and transform to base frame
        const linVelWorld = this.simulation.qvel.subarray(0, 3);
        const linVelVec = new THREE.Vector3(linVelWorld[0], linVelWorld[1], linVelWorld[2]);
        linVelVec.applyQuaternion(quat_inv);
        
        // Update history
        for (let i = this.history.length - 1; i > 0; i--) {
            this.history[i] = this.history[i - 1];
        }
        this.history[0] = new Float32Array([
            linVelVec.x * this.scale,
            linVelVec.y * this.scale,
            linVelVec.z * this.scale
        ]);
        
        // Flatten and return
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.history[i], i * 3);
        }
        return flattened;
    }
}

/**
 * Base angular velocity (in base frame or world frame)
 * Dims: 3 * history_steps
 */
export class BaseAngularVelocity {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { 
            history_steps = 1, 
            scale = 1.0,
            world_frame = false  // if true, return world frame (for legacy HIMLocoObs compatibility)
        } = kwargs;
        this.steps = history_steps;
        this.scale = scale;
        this.world_frame = world_frame;
        this.history = new Array(this.steps).fill(null).map(() => new Float32Array(3));
    }

    compute() {
        // Get angular velocity in world frame
        const angVelWorld = this.simulation.qvel.subarray(3, 6);
        
        let angVel;
        if (this.world_frame) {
            // Keep in world frame (legacy HIMLocoObs behavior)
            angVel = {
                x: angVelWorld[0] * this.scale,
                y: angVelWorld[1] * this.scale,
                z: angVelWorld[2] * this.scale
            };
        } else {
            // Transform to base frame (recommended for new policies)
            const baseQuat = this.simulation.qpos.subarray(3, 7);
            const quat_inv = new THREE.Quaternion(baseQuat[1], baseQuat[2], baseQuat[3], baseQuat[0]).invert();
            const angVelVec = new THREE.Vector3(angVelWorld[0], angVelWorld[1], angVelWorld[2]);
            angVelVec.applyQuaternion(quat_inv);
            
            angVel = {
                x: angVelVec.x * this.scale,
                y: angVelVec.y * this.scale,
                z: angVelVec.z * this.scale
            };
        }
        
        // Update history
        for (let i = this.history.length - 1; i > 0; i--) {
            this.history[i] = this.history[i - 1];
        }
        this.history[0] = new Float32Array([angVel.x, angVel.y, angVel.z]);
        
        // Flatten and return
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.history[i], i * 3);
        }
        return flattened;
    }
}

/**
 * Projected gravity vector in base frame
 * Dims: 3 * history_steps
 */
export class ProjectedGravity {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_name = 'floating_base_joint',
            history_steps = 1,
            gravity = [0, 0, -1.0],
        } = kwargs;
        this.steps = history_steps;
        this.history = new Array(this.steps).fill(null).map(() => new Float32Array(3));
        
        const jointIdx = runtime.jointNamesMJC.indexOf(joint_name);
        this.joint_qpos_adr = model.jnt_qposadr[jointIdx];
        this.gravity = new THREE.Vector3(...gravity);
    }

    compute() {
        const quat = this.simulation.qpos.subarray(this.joint_qpos_adr + 3, this.joint_qpos_adr + 7);
        const quat_inv = new THREE.Quaternion(quat[1], quat[2], quat[3], quat[0]).invert();
        const gravity = this.gravity.clone().applyQuaternion(quat_inv);
        
        for (let i = this.history.length - 1; i > 0; i--) {
            this.history[i] = this.history[i - 1];
        }
        this.history[0] = new Float32Array([gravity.x, gravity.y, gravity.z]);
        
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.history[i], i * 3);
        }
        return flattened;
    }
}

/**
 * Joint positions (absolute or relative to default)
 * Dims: num_joints * history_steps
 */
export class JointPositions {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_names = [],
            history_steps = 1,
            subtract_default = false,
            scale = 1.0,
        } = kwargs;

        this.steps = history_steps;
        this.joint_names = joint_names;
        this.num_joints = joint_names.length;
        this.subtract_default = subtract_default;
        this.scale = scale;
        this.defaultJpos = runtime.defaultJpos;
        this.history = new Array(this.steps).fill(null).map(() => new Float32Array(this.num_joints));

        this.joint_qpos_adr = [];
        for (let i = 0; i < joint_names.length; i++) {
            const idx = runtime.jointNamesMJC.indexOf(joint_names[i]);
            this.joint_qpos_adr.push(model.jnt_qposadr[idx]);
        }
    }

    compute() {
        const current = new Float32Array(this.num_joints);
        for (let i = 0; i < this.num_joints; i++) {
            let pos = this.simulation.qpos[this.joint_qpos_adr[i]];
            if (this.subtract_default) {
                pos -= this.defaultJpos[i];
            }
            current[i] = pos * this.scale;
        }
        
        for (let i = this.history.length - 1; i > 0; i--) {
            this.history[i] = this.history[i - 1];
        }
        this.history[0] = current;
        
        const flattened = new Float32Array(this.steps * this.num_joints);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.history[i], i * this.num_joints);
        }
        return flattened;
    }
}

/**
 * Joint velocities
 * Dims: num_joints * history_steps
 */
export class JointVelocities {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_names = [],
            history_steps = 1,
            scale = 1.0,
        } = kwargs;

        this.steps = history_steps;
        this.joint_names = joint_names;
        this.num_joints = joint_names.length;
        this.scale = scale;
        this.history = new Array(this.steps).fill(null).map(() => new Float32Array(this.num_joints));

        this.joint_qvel_adr = [];
        for (let i = 0; i < joint_names.length; i++) {
            const idx = runtime.jointNamesMJC.indexOf(joint_names[i]);
            this.joint_qvel_adr.push(model.jnt_dofadr[idx]);
        }
    }

    compute() {
        const current = new Float32Array(this.num_joints);
        for (let i = 0; i < this.num_joints; i++) {
            current[i] = this.simulation.qvel[this.joint_qvel_adr[i]] * this.scale;
        }
        
        for (let i = this.history.length - 1; i > 0; i--) {
            this.history[i] = this.history[i - 1];
        }
        this.history[0] = current;
        
        const flattened = new Float32Array(this.steps * this.num_joints);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.history[i], i * this.num_joints);
        }
        return flattened;
    }
}

/**
 * Previous actions from action buffer
 * Dims: num_actions * history_steps
 * 
 * Supports two flattening modes:
 * - transpose=false (default): [a0_t0, a1_t0, ..., aN_t0, a0_t1, a1_t1, ..., aN_t1, ...]
 * - transpose=true: [a0_t0, a0_t1, a0_t2, a1_t0, a1_t1, a1_t2, ...]
 */
export class PreviousActions {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { history_steps = 1, transpose = false } = kwargs;
        this.steps = history_steps;
        this.transpose = transpose;
        this.numActions = runtime.numActions;
        this.actionBuffer = runtime.actionBuffer;
    }

    compute() {
        const flattened = new Float32Array(this.steps * this.numActions);
        
        if (this.transpose) {
            // Transposed flattening
            // [action0_t0, action0_t1, ..., action1_t0, action1_t1, ...]
            for (let i = 0; i < this.steps; i++) {
                const source = this.actionBuffer[i] || new Float32Array(this.numActions);
                for (let j = 0; j < this.numActions; j++) {
                    flattened[j * this.steps + i] = source[j];
                }
            }
        } else {
            // Normal flattening
            // [all_actions_t0, all_actions_t1, all_actions_t2, ...]
            for (let i = 0; i < this.steps; i++) {
                const source = this.actionBuffer[i] || new Float32Array(this.numActions);
                flattened.set(source, i * this.numActions);
            }
        }
        
        return flattened;
    }
}

/**
 * Simple velocity command (vel_x, vel_y, ang_vel_yaw)
 * Dims: 3 * history_steps
 * 
 * Note: Usually commands don't need history (history_steps=1), but some legacy
 * policies like HIMLocoObs include commands in the observation history buffer.
 * Set history_steps > 1 to replicate the command across multiple timesteps.
 */
export class SimpleVelocityCommand {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { scale = [1.0, 1.0, 1.0], history_steps = 1 } = kwargs;
        this.scale = Array.isArray(scale) ? scale : [scale, scale, scale];
        this.steps = history_steps;
    }

    compute() {
        const command = new Float32Array([
            (this.runtime.params.command_vel_x || 0.0) * this.scale[0],
            0.0 * this.scale[1],  // vel_y
            0.0 * this.scale[2],  // ang_vel_yaw
        ]);
        
        // If history_steps > 1, replicate the command across all timesteps
        if (this.steps === 1) {
            return command;
        }
        
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(command, i * 3);
        }
        return flattened;
    }
}

