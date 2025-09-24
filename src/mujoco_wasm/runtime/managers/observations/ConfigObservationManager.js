import * as ort from 'onnxruntime-web';
import { BaseManager } from '../BaseManager.js';
import { Observations } from '../../observations/index.js';

export class ConfigObservationManager extends BaseManager {
    constructor() {
        super();
        this.observationGroups = {};
    }

    async onPolicyLoaded({ config, model, simulation, assetMeta }) {
        this.observationGroups = {};
        const obsConfig = config.obs_config || {};
        for (const [key, obsList] of Object.entries(obsConfig)) {
            this.observationGroups[key] = obsList.map(obsConfigItem => this.createObservationInstance({
                obsConfig: obsConfigItem,
                model,
                simulation,
                assetMeta,
            }));
        }
    }

    createObservationInstance({ obsConfig, model, simulation }) {
        const ObsClass = Observations[obsConfig.name];
        if (!ObsClass) {
            throw new Error(`Unknown observation type: ${obsConfig.name}`);
        }
        const kwargs = { ...obsConfig };
        delete kwargs.name;
        if (kwargs.joint_names === 'isaac') {
            kwargs.joint_names = this.runtime.jointNamesIsaac;
        }
        return new ObsClass(model, simulation, this.runtime, kwargs);
    }

    collect() {
        const tensors = {};
        for (const [key, obsList] of Object.entries(this.observationGroups)) {
            const obsForKey = [];
            for (const obs of obsList) {
                const values = obs.compute();
                obsForKey.push(...values);
            }
            tensors[key] = new ort.Tensor('float32', obsForKey, [1, obsForKey.length]);
        }
        return tensors;
    }
}
