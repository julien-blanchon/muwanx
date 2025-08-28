// Simulation Worker - runs simulation in background thread
let simulation = null;
let model = null;
let state = null;
let alive = true;
let timestep = 0.001;
let decimation = 20;
let simStepCount = 0;

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'init':
      // Initialize simulation with data from main thread
      model = data.model;
      state = data.state;
      simulation = data.simulation;
      timestep = data.timestep;
      decimation = data.decimation;
      break;
      
    case 'step':
      // Run simulation steps
      if (simulation && alive) {
        for (let substep = 0; substep < decimation; substep++) {
          simulation.step();
          simStepCount++;
        }
        
        // Send updated state back to main thread
        self.postMessage({
          type: 'state_update',
          data: {
            qpos: simulation.qpos.slice(),
            qvel: simulation.qvel.slice(),
            xpos: simulation.xpos.slice(),
            xquat: simulation.xquat.slice(),
            simStepCount: simStepCount
          }
        });
      }
      break;
      
    case 'set_alive':
      alive = data.alive;
      break;
      
    case 'set_params':
      // Update simulation parameters
      if (simulation) {
        Object.assign(simulation, data.params);
      }
      break;
  }
};

// Main simulation loop using setInterval for consistent timing
function startSimulationLoop() {
  const targetInterval = timestep * decimation * 1000; // Convert to milliseconds
  
  setInterval(() => {
    if (alive && simulation) {
      self.postMessage({ type: 'request_step' });
    }
  }, targetInterval);
}

startSimulationLoop(); 