import * as THREE from 'three';

export class DecapObs {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        this.defaultJpos = runtime.defaultJpos;

        this.commands_scale = [2.0, 2.0, 0.25];
        this.dof_pos_scale = 1.0;
        this.dof_vel_scale = 0.05;

        const { joint_names } = kwargs;
        this.joint_qpos_adr = [];
        this.joint_qvel_adr = [];
        for (let i = 0; i < joint_names.length; i++) {
            const idx = runtime.jointNamesMJC.indexOf(joint_names[i]);
            this.joint_qpos_adr.push(model.jnt_qposadr[idx]);
            this.joint_qvel_adr.push(model.jnt_dofadr[idx]);
        }
    }

    compute() {
        const command_vel_x = this.runtime.params.command_vel_x;
        let commands = [command_vel_x, 0.0, 0.0];
        commands = commands.map((cmd, i) => cmd * this.commands_scale[i]);

        const quat = this.simulation.qpos.subarray(3, 7);
        const quat_inv = new THREE.Quaternion(quat[1], quat[2], quat[3], quat[0]).invert();
        const projected_gravity = new THREE.Vector3(0, 0, -1.0).applyQuaternion(quat_inv);

        const dof_pos = new Float32Array(12);
        for (let i = 0; i < 12; i++) {
            dof_pos[i] = (this.simulation.qpos[this.joint_qpos_adr[i]] - this.defaultJpos[i]) * this.dof_pos_scale;
        }
        const dof_vel = new Float32Array(12);
        for (let i = 0; i < 12; i++) {
            dof_vel[i] = this.simulation.qvel[this.joint_qvel_adr[i]] * this.dof_vel_scale;
        }

        const actions = this.runtime.lastActions || new Float32Array(12);

        return [
            ...projected_gravity,
            ...commands,
            ...dof_pos,
            ...dof_vel,
            ...actions,
        ];
    }
}
