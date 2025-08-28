// Improved main loop approach
export class MuJoCoDemoImproved {
  constructor(mujoco) {
    // ... existing constructor code ...
    
    this.simulationTime = 0;
    this.lastSimulationTime = 0;
    this.simulationInterval = null;
  }

  async init() {
    // ... existing init code ...
    
    // Start simulation loop with better timing
    this.startSimulationLoop();
  }

  startSimulationLoop() {
    const targetInterval = this.timestep * this.decimation * 1000;
    
    // Use requestAnimationFrame for better timing precision
    const simulationLoop = (currentTime) => {
      if (!this.alive) return;
      
      if (currentTime - this.lastSimulationTime >= targetInterval) {
        this.simulationStep();
        this.lastSimulationTime = currentTime;
      }
      
      requestAnimationFrame(simulationLoop);
    };
    
    requestAnimationFrame(simulationLoop);
  }

  simulationStep() {
    if (this.params["paused"] || !this.model || !this.state || !this.simulation) {
      return;
    }

    // Run policy inference (this can be async)
    this.runInferenceAsync();
    
    // Step simulation
    for (let substep = 0; substep < this.decimation; substep++) {
      this.applyControl();
      this.handlePerturbations();
      this.simulation.step();
      this.simulationTime += this.timestep;
      this.simStepCount++;
    }
    
    // Update cached state for renderer
    this.updateCachedState();
  }

  async runInferenceAsync() {
    if (this.isInferencing) return;
    
    // Run inference in a microtask to avoid blocking
    queueMicrotask(async () => {
      const obs_dict = this.getObservations(this.simulation);
      await this.runInference(obs_dict);
    });
  }

  applyControl() {
    if (!this.lastActions) return;
    
    for (let i = 0; i < this.numActions; i++) {
      const qpos_adr = this.qpos_adr_isaac[i];
      const qvel_adr = this.qvel_adr_isaac[i];
      const ctrl_adr = this.ctrl_adr_isaac[i];

      const targetJpos = 0.5 * this.lastActions[i] + this.defaultJpos[i];
      const torque = this.jntKp[i] * (targetJpos - this.simulation.qpos[qpos_adr]) + 
                     this.jntKd[i] * (0 - this.simulation.qvel[qvel_adr]);
      this.simulation.ctrl[ctrl_adr] = torque;
    }
  }

  handlePerturbations() {
    // ... existing perturbation handling code ...
  }

  updateCachedState() {
    // ... existing state caching code ...
  }

  stopSimulationLoop() {
    this.alive = false;
  }
} 