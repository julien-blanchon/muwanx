import * as THREE from 'three';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { downloadExampleScenesFolder, getPosition, getQuaternion, loadSceneFromURL } from './utils/mujocoScene.js';
import { ONNXModule } from '../examples/onnxHelper.js';
import { TrajectoryActionManager } from './managers/actions/TrajectoryActionManager.js';

const DEFAULT_CONTAINER_ID = 'mujoco-container';

export class MujocoRuntime {
    constructor(mujoco, options = {}) {
        this.mujoco = mujoco;
        const workingPath = '/working';
        try {
            mujoco.FS.mkdir(workingPath);
        } catch (error) {
            if (error?.code !== 'EEXIST') {
                console.warn('Failed to create /working directory:', error);
            }
        }
        try {
            mujoco.FS.mount(mujoco.MEMFS, { root: '.' }, workingPath);
        } catch (error) {
            if (error?.code !== 'EEXIST' && error?.code !== 'EBUSY') {
                console.warn('Failed to mount MEMFS at /working:', error);
            }
        }
        this.options = options;
        this.container = document.getElementById(options.containerId || DEFAULT_CONTAINER_ID);
        if (!this.container) {
            throw new Error(`Failed to find container element with id ${options.containerId || DEFAULT_CONTAINER_ID}`);
        }

        this.commandManager = options.commandManager || null;
        this.actionManager = options.actionManager || null;
        this.observationManagers = options.observationManagers || [];
        this.envManagers = options.envManagers || [];

        this.services = new Map();

        this.params = {
            paused: true,
            help: false,
            command_vel_x: 0.0,
            impedance_kp: 24.0,
            use_setpoint: true,
            impulse_remain_time: 0.0,
            compliant_mode: false,
        };

        this.scene = new THREE.Scene();
        this.scene.name = 'scene';

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 100);
        this.camera.name = 'PerspectiveCamera';
        this.camera.position.set(2.0, 1.7, 1.7);
        this.scene.add(this.camera);

        this.scene.background = new THREE.Color(0.15, 0.25, 0.35);
        this.scene.fog = new THREE.Fog(this.scene.background, 15, 25.5);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.ambientLight.name = 'AmbientLight';
        this.scene.add(this.ambientLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.2, 0);
        this.controls.panSpeed = 2;
        this.controls.zoomSpeed = 1;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.10;
        this.controls.screenSpacePanning = true;
        this.controls.update();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.setAnimationLoop(this.render.bind(this));

        this.lastSimState = {
            bodies: new Map(),
            lights: new Map(),
            tendons: {
                numWraps: 0,
                matrix: new THREE.Matrix4()
            }
        };

        this.model = null;
        this.state = null;
        this.simulation = null;
        this.policy = null;
        this.inputDict = null;
        this.loopHandle = null;
        this.running = false;
        this.alive = false;
        this.actionContext = {};
        this.assetMetadata = null;

        this.attachManagers();
    }

    attachManagers() {
        if (this.commandManager) {
            this.commandManager.attachRuntime(this);
        }
        if (this.actionManager) {
            this.actionManager.attachRuntime(this);
        }
        for (const manager of this.observationManagers) {
            manager.attachRuntime(this);
        }
        for (const manager of this.envManagers) {
            manager.attachRuntime(this);
        }
    }

    registerService(name, service) {
        this.services.set(name, service);
    }

    unregisterService(name) {
        this.services.delete(name);
    }

    getService(name) {
        return this.services.get(name);
    }

    async init(initialConfig = {}) {
        if (this.commandManager && typeof this.commandManager.onInit === 'function') {
            await this.commandManager.onInit();
        }
        if (this.actionManager && typeof this.actionManager.onInit === 'function') {
            await this.actionManager.onInit();
        }
        for (const manager of [...this.observationManagers, ...this.envManagers]) {
            if (typeof manager.onInit === 'function') {
                await manager.onInit();
            }
        }

        if (initialConfig.scenePath) {
            await this.loadEnvironment(initialConfig);
        }
    }

    async loadEnvironment({ scenePath, metaPath, policyPath }) {
        await this.stop();
        await downloadExampleScenesFolder(this.mujoco, scenePath);
        await this.loadScene(scenePath, metaPath);

        if (policyPath) {
            await this.loadPolicy(policyPath);
        } else {
            await this.clearPolicy();
        }
        this.alive = true;
        this.running = true;
        this.startLoop();
    }

    async clearPolicy() {
        this.policy = null;
        this.policyConfig = null;
        this.inputDict = null;
        this.isInferencing = false;

        if (this.actionManager && typeof this.actionManager.onPolicyCleared === 'function') {
            await this.actionManager.onPolicyCleared();
        }
        for (const manager of this.observationManagers) {
            if (typeof manager.onPolicyCleared === 'function') {
                await manager.onPolicyCleared();
            }
        }
    }

    async loadScene(mjcfPath, metaPath) {
        this.scene.remove(this.scene.getObjectByName('MuJoCo Root'));
        [this.model, this.state, this.simulation, this.bodies, this.lights] =
            await loadSceneFromURL(this.mujoco, mjcfPath, this);

        let assetMeta = null;
        if (metaPath && metaPath !== 'null') {
            const response = await fetch(metaPath);
            assetMeta = await response.json();
        }

        this.timestep = this.model.getOptions().timestep;
        this.decimation = Math.round(0.02 / this.timestep);
        this.mujoco_time = 0.0;
        this.simStepCount = 0;
        this.inferenceStepCount = 0;
        this.assetMetadata = assetMeta;

        if (this.actionManager && typeof this.actionManager.onSceneLoaded === 'function') {
            await this.actionManager.onSceneLoaded({
                model: this.model,
                simulation: this.simulation,
                assetMeta,
            });
        }
        for (const manager of this.envManagers) {
            if (typeof manager.onSceneLoaded === 'function') {
                await manager.onSceneLoaded({
                    model: this.model,
                    simulation: this.simulation,
                    assetMeta,
                });
            }
        }
        this.observationContext = { assetMeta };
    }

    async loadPolicy(policyPath) {
        while (this.isInferencing) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        const response = await fetch(policyPath);
        const config = await response.json();

        this.policyConfig = config;
        this.policy = new ONNXModule(config.onnx);
        await this.policy.init();

        if (this.actionManager && typeof this.actionManager.onPolicyLoaded === 'function') {
            await this.actionManager.onPolicyLoaded({ config });
        }
        for (const manager of this.observationManagers) {
            if (typeof manager.onPolicyLoaded === 'function') {
                await manager.onPolicyLoaded({
                    config,
                    model: this.model,
                    simulation: this.simulation,
                    assetMeta: this.observationContext?.assetMeta,
                });
            }
        }
        for (const manager of this.envManagers) {
            if (typeof manager.onPolicyLoaded === 'function') {
                await manager.onPolicyLoaded({
                    config,
                    model: this.model,
                    simulation: this.simulation,
                    assetMeta: this.observationContext?.assetMeta,
                });
            }
        }

        this.simulation.resetData();
        this.simulation.forward();

        this.adapt_hx = new Float32Array(128);
        this.rpy = new THREE.Euler();
        this.quat = new THREE.Quaternion();

        this.inputDict = this.policy.initInput();
        this.isInferencing = false;
    }

    async startLoop() {
        if (this.loopPromise) {
            return this.loopPromise;
        }
        this.running = true;
        this.loopPromise = this.mainLoop();
        return this.loopPromise;
    }

    async stop() {
        this.running = false;
        const pending = this.loopPromise;
        if (pending) {
            await pending;
        }
        this.loopPromise = null;
        this.alive = false;
    }

    async mainLoop() {
        this.inputDict = this.inputDict || (this.policy ? this.policy.initInput() : {});
        while (this.running) {
            const loopStart = performance.now();
            const ready = !this.params.paused && this.model && this.state && this.simulation;
            if (ready) {
                if (this.actionManager instanceof TrajectoryActionManager) {
                    const obsTensors = await this.collectObservations();
                    const action = await this.actionManager.generateAction(obsTensors);
                    this.applyAction(action);
                    await this.executeSimulationSteps();
                    this.updateCachedState();
                } else if (this.policy) {
                    let time_start = performance.now();
                    const quat = this.simulation.qpos.subarray(3, 7);
                    this.quat.set(quat[1], quat[2], quat[3], quat[0]);
                    this.rpy.setFromQuaternion(this.quat);

                    const obsTensors = await this.collectObservations();
                    Object.assign(this.inputDict, obsTensors);

                    try {
                        await this.runInference();
                    } catch (e) {
                        console.error('Inference error in main loop:', e);
                        this.running = false;
                        break;
                    }

                    let time_end = performance.now();
                    const policy_inference_time = time_end - time_start;
                    time_start = time_end;

                    await this.executeSimulationSteps();

                    time_end = performance.now();
                    const sim_step_time = time_end - time_start;
                    time_start = time_end;

                    this.updateCachedState();

                    time_end = performance.now();
                    const update_render_time = time_end - time_start;
                } else {
                    await this.executeSimulationSteps();
                    this.updateCachedState();
                }
            }

            const loopEnd = performance.now();
            const elapsed = (loopEnd - loopStart) / 1000;
            const sleepTime = Math.max(0, this.timestep * this.decimation - elapsed);
            await new Promise(resolve => setTimeout(resolve, sleepTime * 1000));
        }
        this.loopPromise = null;
    }

    applyAction(action) {
        if (!this.simulation || !this.simulation.ctrl) {
            return;
        }
        const ctrl = this.simulation.ctrl;
        if (!action || typeof action.length !== 'number') {
            ctrl.fill(0);
            return;
        }
        const length = Math.min(action.length, ctrl.length);
        for (let i = 0; i < length; i++) {
            ctrl[i] = action[i];
        }
        for (let i = length; i < ctrl.length; i++) {
            ctrl[i] = 0;
        }
    }

    async executeSimulationSteps() {
        for (let substep = 0; substep < this.decimation; substep++) {
            const stepContext = {
                model: this.model,
                simulation: this.simulation,
                timestep: this.timestep,
                substep,
            };
            if (this.actionManager && typeof this.actionManager.beforeSimulationStep === 'function') {
                this.actionManager.beforeSimulationStep(stepContext);
            }
            for (const manager of this.envManagers) {
                if (typeof manager.beforeSimulationStep === 'function') {
                    manager.beforeSimulationStep(stepContext);
                }
            }

            this.simulation.step();
            this.mujoco_time += this.timestep * 1000.0;
            this.simStepCount += 1;

            if (this.actionManager && typeof this.actionManager.afterSimulationStep === 'function') {
                this.actionManager.afterSimulationStep(stepContext);
            }
            for (const manager of this.envManagers) {
                if (typeof manager.afterSimulationStep === 'function') {
                    manager.afterSimulationStep(stepContext);
                }
            }
        }
    }

    async collectObservations() {
        if (!this.observationManagers.length) {
            return {};
        }
        const tensors = {};
        for (const manager of this.observationManagers) {
            if (typeof manager.collect === 'function') {
                const result = manager.collect({
                    model: this.model,
                    simulation: this.simulation,
                    policyConfig: this.policyConfig,
                    params: this.params,
                });
                Object.assign(tensors, result);
            }
        }
        return tensors;
    }

    async runInference() {
        if (!this.policy || this.isInferencing) {
            return;
        }
        this.isInferencing = true;
        this.inferenceStepCount += 1;
        try {
            const [result, carry] = await this.policy.runInference(this.inputDict);
            if (this.actionManager && typeof this.actionManager.onPolicyOutput === 'function') {
                this.actionManager.onPolicyOutput(result);
            }
            this.inputDict = carry;
        } finally {
            this.isInferencing = false;
        }
    }

    updateCachedState() {
        if (!this.model || !this.simulation) {
            return;
        }
        for (let b = 0; b < this.model.nbody; b++) {
            if (this.bodies[b]) {
                if (!this.lastSimState.bodies.has(b)) {
                    this.lastSimState.bodies.set(b, {
                        position: new THREE.Vector3(),
                        quaternion: new THREE.Quaternion()
                    });
                }
                getPosition(this.simulation.xpos, b, this.lastSimState.bodies.get(b).position);
                getQuaternion(this.simulation.xquat, b, this.lastSimState.bodies.get(b).quaternion);
            }
        }

        for (let l = 0; l < this.model.nlight; l++) {
            if (this.lights[l]) {
                if (!this.lastSimState.lights.has(l)) {
                    this.lastSimState.lights.set(l, {
                        position: new THREE.Vector3(),
                        direction: new THREE.Vector3()
                    });
                }
                getPosition(this.simulation.light_xpos, l, this.lastSimState.lights.get(l).position);
                getPosition(this.simulation.light_xdir, l, this.lastSimState.lights.get(l).direction);
            }
        }

        if (this.mujocoRoot && this.mujocoRoot.cylinders) {
            let numWraps = 0;
            const mat = this.lastSimState.tendons.matrix;

            for (let t = 0; t < this.model.ntendon; t++) {
                let startW = this.simulation.ten_wrapadr[t];
                let r = this.model.tendon_width[t];
                for (let w = startW; w < startW + this.simulation.ten_wrapnum[t] - 1; w++) {
                    let tendonStart = getPosition(this.simulation.wrap_xpos, w, new THREE.Vector3());
                    let tendonEnd = getPosition(this.simulation.wrap_xpos, w + 1, new THREE.Vector3());
                    let tendonAvg = new THREE.Vector3().addVectors(tendonStart, tendonEnd).multiplyScalar(0.5);

                    let validStart = tendonStart.length() > 0.01;
                    let validEnd = tendonEnd.length() > 0.01;

                    if (validStart) { this.mujocoRoot.spheres.setMatrixAt(numWraps, mat.compose(tendonStart, new THREE.Quaternion(), new THREE.Vector3(r, r, r))); }
                    if (validEnd) { this.mujocoRoot.spheres.setMatrixAt(numWraps + 1, mat.compose(tendonEnd, new THREE.Quaternion(), new THREE.Vector3(r, r, r))); }
                    if (validStart && validEnd) {
                        mat.compose(tendonAvg,
                            new THREE.Quaternion().setFromUnitVectors(
                                new THREE.Vector3(0, 1, 0),
                                tendonEnd.clone().sub(tendonStart).normalize()
                            ),
                            new THREE.Vector3(r, tendonStart.distanceTo(tendonEnd), r)
                        );
                        this.mujocoRoot.cylinders.setMatrixAt(numWraps, mat);
                        numWraps++;
                    }
                }
            }
            this.lastSimState.tendons.numWraps = numWraps;
        }
    }

    render() {
        if (!this.model || !this.state || !this.simulation) {
            return;
        }

        this.controls.update();

        for (const [b, state] of this.lastSimState.bodies) {
            if (this.bodies[b]) {
                this.bodies[b].position.copy(state.position);
                this.bodies[b].quaternion.copy(state.quaternion);
                this.bodies[b].updateWorldMatrix();
            }
        }

        for (const [l, state] of this.lastSimState.lights) {
            if (this.lights[l]) {
                this.lights[l].position.copy(state.position);
                this.lights[l].lookAt(state.direction.add(this.lights[l].position));
            }
        }

        if (this.mujocoRoot && this.mujocoRoot.cylinders) {
            const numWraps = this.lastSimState.tendons.numWraps;
            this.mujocoRoot.cylinders.count = numWraps;
            this.mujocoRoot.spheres.count = numWraps > 0 ? numWraps + 1 : 0;
            this.mujocoRoot.cylinders.instanceMatrix.needsUpdate = true;
            this.mujocoRoot.spheres.instanceMatrix.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    pause() {
        this.params.paused = true;
    }

    resume() {
        this.params.paused = false;
    }

    async reset() {
        if (!this.simulation) {
            return;
        }
        this.params.paused = true;
        this.simulation.resetData();
        this.simulation.forward();
        this.params.paused = false;
        if (this.commandManager && typeof this.commandManager.reset === 'function') {
            this.commandManager.reset();
        }
        for (const manager of this.envManagers) {
            if (typeof manager.reset === 'function') {
                manager.reset();
            }
        }
    }

    dispose() {
        // Stop the simulation loop first
        this.stop();
        
        // Clear policy and ONNX session
        if (this.policy && this.policy.session) {
            try {
                this.policy.session.release();
            } catch (e) {
                console.warn('Failed to release ONNX session:', e);
            }
        }
        this.policy = null;
        this.inputDict = null;
        
        // Free WebAssembly objects in correct order
        if (this.simulation) {
            try {
                this.simulation.free();
            } catch (e) {
                console.warn('Failed to free simulation:', e);
            }
            this.simulation = null;
        }
        if (this.state) {
            try {
                this.state.free();
            } catch (e) {
                console.warn('Failed to free state:', e);
            }
            this.state = null;
        }
        if (this.model) {
            try {
                this.model.free();
            } catch (e) {
                console.warn('Failed to free model:', e);
            }
            this.model = null;
        }
        
        // Dispose Three.js scene objects
        this.disposeThreeJSResources();
        
        // Remove event listeners and dispose renderer
        window.removeEventListener('resize', this.onWindowResize);
        if (this.controls) {
            this.controls.dispose();
        }
        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
        
        // Dispose managers
        if (this.commandManager && typeof this.commandManager.dispose === 'function') {
            this.commandManager.dispose();
        }
        if (this.actionManager && typeof this.actionManager.dispose === 'function') {
            this.actionManager.dispose();
        }
        for (const manager of [...this.observationManagers, ...this.envManagers]) {
            if (typeof manager.dispose === 'function') {
                manager.dispose();
            }
        }
        
        // Clear references
        this.bodies = null;
        this.lights = null;
        this.mujocoRoot = null;
        this.lastSimState = null;
        this.services.clear();
    }
    
    disposeThreeJSResources() {
        if (this.scene) {
            // Recursively dispose all objects in the scene
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            this.disposeMaterial(material);
                        });
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }
            });
            
            // Clear the scene
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }
    }
    
    disposeMaterial(material) {
        if (material) {
            // Dispose textures
            Object.keys(material).forEach(prop => {
                const value = material[prop];
                if (value && typeof value === 'object' && value.isTexture) {
                    value.dispose();
                }
            });
            
            // Dispose the material itself
            material.dispose();
        }
    }
}
