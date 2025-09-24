import * as THREE from 'three';

export class BaseAngVelMultistep {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            base_joint_name = 'floating_base_joint',
            history_steps = 4,
        } = kwargs;
        this.steps = history_steps;
        this.angvel_multistep = new Array(this.steps).fill(null).map(() => new Float32Array(3));

        const jointIdx = runtime.jointNamesMJC.indexOf(base_joint_name);
        this.joint_qvel_adr = model.jnt_dofadr[jointIdx];
    }

    compute() {
        for (let i = this.angvel_multistep.length - 1; i > 0; i--) {
            this.angvel_multistep[i] = this.angvel_multistep[i - 1];
        }
        const angvel = this.simulation.qvel.subarray(this.joint_qvel_adr, this.joint_qvel_adr + 3);
        this.angvel_multistep[0] = angvel;
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.angvel_multistep[i], i * 3);
        }
        return flattened;
    }
}

export class GravityMultistep {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_name = 'floating_base_joint',
            history_steps = 4,
            gravity = [0, 0, -1.0],
        } = kwargs;
        this.steps = history_steps;
        this.gravity_multistep = new Array(this.steps).fill(null).map(() => new Float32Array(3));

        const jointIdx = runtime.jointNamesMJC.indexOf(joint_name);
        this.joint_qpos_adr = model.jnt_qposadr[jointIdx];
        this.gravity = new THREE.Vector3(...gravity);
    }

    compute() {
        const quat = this.simulation.qpos.subarray(this.joint_qpos_adr + 3, this.joint_qpos_adr + 7);
        const quat_inv = new THREE.Quaternion(quat[1], quat[2], quat[3], quat[0]).invert();
        const gravity = this.gravity.clone().applyQuaternion(quat_inv);
        for (let i = this.gravity_multistep.length - 1; i > 0; i--) {
            this.gravity_multistep[i] = this.gravity_multistep[i - 1];
        }
        this.gravity_multistep[0] = new Float32Array([gravity.x, gravity.y, gravity.z]);
        const flattened = new Float32Array(this.steps * 3);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.gravity_multistep[i], i * 3);
        }
        return flattened;
    }
}

export class JointPosMultistep {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_names = [],
            history_steps = 4,
        } = kwargs;

        this.steps = history_steps;
        this.joint_names = joint_names;
        this.joint_pos_multistep = new Array(this.steps).fill(null).map(() => new Float32Array(joint_names.length));

        this.joint_qpos_adr = [];
        for (let i = 0; i < joint_names.length; i++) {
            const idx = runtime.jointNamesMJC.indexOf(joint_names[i]);
            this.joint_qpos_adr.push(model.jnt_qposadr[idx]);
        }
    }

    compute() {
        for (let i = this.joint_pos_multistep.length - 1; i > 0; i--) {
            this.joint_pos_multistep[i] = this.joint_pos_multistep[i - 1];
        }
        for (let i = 0; i < this.joint_names.length; i++) {
            this.joint_pos_multistep[0][i] = this.simulation.qpos[this.joint_qpos_adr[i]];
        }
        const flattened = new Float32Array(this.steps * this.joint_names.length);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.joint_pos_multistep[i], i * this.joint_names.length);
        }
        return flattened;
    }
}

export class JointVelMultistep {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const {
            joint_names = [],
            history_steps = 4,
        } = kwargs;

        this.steps = history_steps;
        this.joint_names = joint_names;
        this.numJoints = joint_names.length;
        this.joint_vel_multistep = new Array(this.steps).fill(null).map(() => new Float32Array(this.numJoints));

        this.joint_qvel_adr = [];
        for (let i = 0; i < joint_names.length; i++) {
            const idx = runtime.jointNamesMJC.indexOf(joint_names[i]);
            this.joint_qvel_adr.push(model.jnt_dofadr[idx]);
        }
    }

    compute() {
        for (let i = this.joint_vel_multistep.length - 1; i > 0; i--) {
            this.joint_vel_multistep[i] = this.joint_vel_multistep[i - 1];
        }
        for (let i = 0; i < this.joint_names.length; i++) {
            this.joint_vel_multistep[0][i] = this.simulation.qvel[this.joint_qvel_adr[i]];
        }
        const flattened = new Float32Array(this.steps * this.numJoints);
        for (let i = 0; i < this.steps; i++) {
            flattened.set(this.joint_vel_multistep[i], i * this.numJoints);
        }
        return flattened;
    }
}

export class PrevActions {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { history_steps = 4 } = kwargs;
        this.steps = history_steps;
        this.numActions = runtime.numActions;
        this.actionBuffer = runtime.actionBuffer;
    }

    compute() {
        const flattened = new Float32Array(this.steps * this.numActions);
        for (let i = 0; i < this.steps; i++) {
            const source = this.actionBuffer[i] || new Float32Array(this.numActions);
            for (let j = 0; j < this.numActions; j++) {
                flattened[j * this.steps + i] = source[j];
            }
        }
        return flattened;
    }
}
