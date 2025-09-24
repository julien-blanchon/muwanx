import { BaseManager } from '../BaseManager.js';

export class IsaacActionManager extends BaseManager {
    constructor(options = {}) {
        super();
        this.options = options;
        this.actionScale = null;
        this.controlType = 'joint_position';
        this.lastActions = null;
        this.actionBuffer = [];
        this.actionSmoothing = options.actionSmoothing ?? { prev: 0.2, current: 0.8 };
        this.decimation = 1;
    }

    async onSceneLoaded({ model, simulation, assetMeta }) {
        this.model = model;
        this.simulation = simulation;
        this.assetMeta = assetMeta;

        this.jointNamesIsaac = assetMeta["joint_names_isaac"] || [];

        this.ctrlAdrIsaac = [];
        this.qposAdrIsaac = [];
        this.qvelAdrIsaac = [];

        const actuator2joint = [];
        for (let i = 0; i < model.nu; i++) {
            const actuator_trntype = model.actuator_trntype[i];
            if (actuator_trntype !== this.runtime.mujoco.mjtTrn.mjTRN_JOINT.value) {
                throw new Error('Expected actuator transmission type to be mjTRN_JOINT');
            }
            actuator2joint.push(model.actuator_trnid[2 * i]);
        }

        this.jointNamesMJC = [];
        const textDecoder = new TextDecoder();
        const namesArray = new Uint8Array(model.names);
        for (let j = 0; j < model.njnt; j++) {
            let startIdx = model.name_jntadr[j];
            let endIdx = startIdx;
            while (endIdx < namesArray.length && namesArray[endIdx] !== 0) {
                endIdx++;
            }
            const name = textDecoder.decode(namesArray.subarray(startIdx, endIdx));
            this.jointNamesMJC.push(name);
        }

        for (const jointNameIsaac of this.jointNamesIsaac) {
            const jointIdx = this.jointNamesMJC.indexOf(jointNameIsaac);
            if (jointIdx < 0) {
                throw new Error(`Failed to find joint ${jointNameIsaac} in MuJoCo model names`);
            }
            const actuatorIdx = actuator2joint.findIndex(jointId => jointId === jointIdx);
            this.ctrlAdrIsaac.push(actuatorIdx);
            this.qposAdrIsaac.push(model.jnt_qposadr[jointIdx]);
            this.qvelAdrIsaac.push(model.jnt_dofadr[jointIdx]);
        }

        this.numActions = this.jointNamesIsaac.length;
        this.runtime.numActions = this.numActions;
        this.runtime.jointNamesIsaac = this.jointNamesIsaac;
        this.defaultJpos = new Float32Array(assetMeta['default_joint_pos'] || []);
        this.actionBuffer = new Array(4).fill(null).map(() => new Float32Array(this.numActions));
        this.lastActions = new Float32Array(this.numActions);
        this.runtime.lastActions = this.lastActions;
        this.runtime.actionBuffer = this.actionBuffer;
        this.runtime.defaultJpos = this.defaultJpos;
        this.runtime.jointNamesMJC = this.jointNamesMJC;
        this.runtime.ctrlAdrIsaac = this.ctrlAdrIsaac;
        this.runtime.qposAdrIsaac = this.qposAdrIsaac;
        this.runtime.qvelAdrIsaac = this.qvelAdrIsaac;
        this.decimation = Math.max(1, Math.round(0.02 / model.getOptions().timestep));
    }

    async onPolicyLoaded({ config }) {
        this.controlType = config.control_type ?? 'joint_position';
        this.actionScale = new Float32Array(this.numActions).fill(config.action_scale ?? 1.0);
        this.jntKp = new Float32Array(this.numActions).fill(config.stiffness ?? 0);
        this.jntKd = new Float32Array(this.numActions).fill(config.damping ?? 0);
        this.runtime.actionScale = this.actionScale;
        this.runtime.jntKp = this.jntKp;
        this.runtime.jntKd = this.jntKd;
        this.runtime.controlType = this.controlType;
    }

    onPolicyOutput(result) {
        if (!result || !result.action) {
            return;
        }
        const rawAction = result.action.data;
        if (!this.lastActions || rawAction.length !== this.numActions) {
            this.lastActions = new Float32Array(rawAction.length);
            this.numActions = rawAction.length;
            this.runtime.lastActions = this.lastActions;
        }
        const { prev, current } = this.actionSmoothing;
        for (let i = 0; i < this.numActions; i++) {
            this.lastActions[i] = this.lastActions[i] * prev + rawAction[i] * current;
        }
        for (let i = this.actionBuffer.length - 1; i > 0; i--) {
            this.actionBuffer[i] = this.actionBuffer[i - 1];
        }
        this.actionBuffer[0] = Float32Array.from(this.lastActions);
        this.runtime.lastActions = this.lastActions;
        this.runtime.actionBuffer = this.actionBuffer;
    }

    beforeSimulationStep() {
        if (!this.simulation || !this.lastActions) {
            return;
        }
        if (this.controlType === 'joint_position') {
            for (let i = 0; i < this.numActions; i++) {
                const qposAdr = this.qposAdrIsaac[i];
                const qvelAdr = this.qvelAdrIsaac[i];
                const ctrlAdr = this.ctrlAdrIsaac[i];
                const targetJpos = this.actionScale[i] * this.lastActions[i] + this.defaultJpos[i];
                const torque = this.jntKp[i] * (targetJpos - this.simulation.qpos[qposAdr])
                    + this.jntKd[i] * (0 - this.simulation.qvel[qvelAdr]);
                this.simulation.ctrl[ctrlAdr] = torque;
            }
        } else if (this.controlType === 'torque') {
            for (let i = 0; i < this.numActions; i++) {
                const ctrlAdr = this.ctrlAdrIsaac[i];
                const torque = this.actionScale[i] * this.lastActions[i];
                this.simulation.ctrl[ctrlAdr] = torque;
            }
        }
    }

    afterSimulationStep() {
        // no-op for now
    }

    dispose() {
        this.model = null;
        this.simulation = null;
        this.assetMeta = null;
    }
}
