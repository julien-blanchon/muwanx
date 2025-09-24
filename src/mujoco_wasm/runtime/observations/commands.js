import * as THREE from 'three';

function getOscillator(time) {
    const omega = 4.0 * Math.PI;
    const phase = [
        omega * time + Math.PI,
        omega * time,
        omega * time,
        omega * time + Math.PI,
    ];
    return [...phase.map(Math.sin), ...phase.map(Math.cos), omega, omega, omega, omega];
}

export class VelocityCommand {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { angvel_kp = 1.0 } = kwargs;
        this.angvel_kp = angvel_kp;
    }

    compute() {
        const osc = getOscillator(this.runtime.mujoco_time / 1000.0);
        const command_vel_x = new THREE.Vector3(this.runtime.params.command_vel_x, 0, 0);
        const setvel_b = command_vel_x.clone().applyQuaternion(this.runtime.quat.clone().invert());
        return [setvel_b.x, setvel_b.y, this.angvel_kp * (0 - this.runtime.rpy.z), 0, ...osc];
    }
}

export class ImpedanceCommand {
    constructor(model, simulation, runtime, kwargs = {}) {
        this.model = model;
        this.simulation = simulation;
        this.runtime = runtime;
        const { mass = 1.0 } = kwargs;
        this.mass = mass;
    }

    compute() {
        const kp = this.runtime.params.impedance_kp;
        const kd = 1.8 * Math.sqrt(Math.max(kp, 0.0001));
        const osc = getOscillator(this.runtime.mujoco_time / 1000.0);

        const base_pos_w = new THREE.Vector3(...this.simulation.qpos.subarray(0, 3));
        const command_vel_x = new THREE.Vector3(this.runtime.params.command_vel_x, 0, 0);
        const setpoint = command_vel_x.clone().multiplyScalar(kd / (kp || 1)).add(base_pos_w.clone());
        if (this.runtime.params.compliant_mode) {
            setpoint.copy(base_pos_w);
        }

        const setpointService = this.runtime.getService?.('setpoint-control');

        if (this.runtime.params.use_setpoint) {
            if (setpointService?.ball) {
                setpoint.x = setpointService.ball.position.x;
                setpoint.y = -setpointService.ball.position.z;
                setpoint.z = 0.0;
            }
        } else {
            const targetX = setpoint.x;
            const targetY = setpoint.y;
            setpointService?.setPosition?.(targetX, setpointService.ball?.position.y ?? 0.5, -targetY);
        }

        const setpoint_b = setpoint.sub(base_pos_w).applyQuaternion(this.runtime.quat.clone().invert());
        const setpoint_b_norm = setpoint_b.length();
        setpoint_b.normalize().multiplyScalar(Math.min(setpoint_b_norm, 2.0));

        const command = [
            setpoint_b.x, setpoint_b.y,
            0 - this.runtime.rpy.z,
            kp * setpoint_b.x, kp * setpoint_b.y,
            kd, kd, kd,
            kp * (0 - this.runtime.rpy.z),
            this.mass,
            kp * setpoint_b.x / this.mass, kp * setpoint_b.y / this.mass,
            kd / this.mass, kd / this.mass, kd / this.mass,
        ];

        return [...command, ...osc];
    }
}
