// Hybrid approach with fixed timestep accumulator
export class MuJoCoDemoHybrid {
  constructor(mujoco) {
    // ... existing constructor code ...
    
    this.accumulator = 0;
    this.lastTime = 0;
    this.fixedTimeStep = this.timestep * this.decimation;
  }

  async init() {
    // ... existing init code ...
    
    // Start the game loop
    this.gameLoop();
  }

  gameLoop() {
    if (!this.alive) return;
    
    const currentTime = performance.now() / 1000; // Convert to seconds
    const deltaTime = Math.min(currentTime - this.lastTime, 0.1); // Cap at 100ms
    this.lastTime = currentTime;
    
    if (!this.params["paused"]) {
      this.accumulator += deltaTime;
      
      // Run simulation steps
      while (this.accumulator >= this.fixedTimeStep) {
        this.simulationStep();
        this.accumulator -= this.fixedTimeStep;
      }
    }
    
    // Always render (interpolation can be added here)
    this.render();
    
    // Continue the loop
    requestAnimationFrame(() => this.gameLoop());
  }

  simulationStep() {
    if (!this.model || !this.state || !this.simulation) return;
    
    // Run policy inference
    this.runInferenceSync();
    
    // Step simulation
    for (let substep = 0; substep < this.decimation; substep++) {
      this.applyControl();
      this.handlePerturbations();
      this.simulation.step();
      this.simStepCount++;
    }
    
    // Update cached state
    this.updateCachedState();
  }

  runInferenceSync() {
    if (this.isInferencing) return;
    
    // Run inference synchronously to maintain timing
    const obs_dict = this.getObservations(this.simulation);
    this.runInference(obs_dict);
  }

  // ... rest of the methods remain the same ...
} 