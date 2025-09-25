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
        this.defaultActuatorParams = null;
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

        this.initializeDefaultActuatorParams(assetMeta);
    }

    async onPolicyLoaded({ config }) {
        this.controlType = config.control_type ?? 'joint_position';
        this.setActuatorParams({
            actionScale: config.action_scale,
            stiffness: config.stiffness,
            damping: config.damping,
        });
        this.runtime.controlType = this.controlType;
    }

    async onPolicyCleared() {
        this.controlType = 'joint_position';
        if (this.defaultActuatorParams) {
            this.setActuatorParams(this.defaultActuatorParams);
        } else {
            this.setActuatorParams({});
        }
        this.runtime.controlType = this.controlType;
    }

    initializeDefaultActuatorParams(assetMeta) {
        const actuators = assetMeta?.actuators || {};
        let defaultParams = {
            actionScale: 1.0,
            stiffness: 0.0,
            damping: 0.0,
        };

        for (const actuatorConfig of Object.values(actuators)) {
            if (!actuatorConfig || typeof actuatorConfig !== 'object') {
                continue;
            }
            if (typeof actuatorConfig.action_scale === 'number') {
                defaultParams.actionScale = actuatorConfig.action_scale;
            }
            if (typeof actuatorConfig.stiffness === 'number') {
                defaultParams.stiffness = actuatorConfig.stiffness;
            }
            if (typeof actuatorConfig.damping === 'number') {
                defaultParams.damping = actuatorConfig.damping;
            }
            break;
        }

        this.defaultActuatorParams = defaultParams;
        this.setActuatorParams(defaultParams);
    }

    setActuatorParams({ actionScale, stiffness, damping } = {}) {
        const resolvedActionScale = this.normalizeParam(actionScale, 1.0);
        const resolvedStiffness = this.normalizeParam(stiffness, 0.0);
        const resolvedDamping = this.normalizeParam(damping, 0.0);

        this.actionScale = resolvedActionScale;
        this.jntKp = resolvedStiffness;
        this.jntKd = resolvedDamping;

        this.runtime.actionScale = this.actionScale;
        this.runtime.jntKp = this.jntKp;
        this.runtime.jntKd = this.jntKd;
    }

    normalizeParam(value, fallback) {
        if (value instanceof Float32Array && value.length === this.numActions) {
            return value;
        }
        if (Array.isArray(value)) {
            const array = new Float32Array(this.numActions);
            for (let i = 0; i < this.numActions; i++) {
                array[i] = typeof value[i] === 'number' ? value[i] : fallback;
            }
            return array;
        }
        const fillValue = typeof value === 'number' ? value : fallback;
        return new Float32Array(this.numActions).fill(fillValue);
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
