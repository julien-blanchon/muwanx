/**
 * Observation components for MuJoCo runtime
 * 
 * ## Recommended Approach (Modular & Composable)
 * Import atomic components for maximum flexibility:
 * ```javascript
 * import { BaseLinearVelocity, ProjectedGravity, JointPositions, ... } from './atomic.js';
 * ```
 * 
 * These components support history_steps parameter:
 * - history_steps = 1: single timestep (current state)
 * - history_steps > 1: temporal history
 * 
 * ## Legacy Approach (Backwards Compatible)
 * Monolithic observation classes are still available:
 * ```javascript
 * import { HIMLocoObs, G1VelocityObs, DecapObs, ... } from './legacy.js';
 * ```
 */

// Modern atomic components (recommended for new projects)
import {
    BaseLinearVelocity,
    BaseAngularVelocity,
    ProjectedGravity,
    JointPositions,
    JointVelocities,
    PreviousActions,
    SimpleVelocityCommand,
} from './atomic.js';

// Command components
import {
    VelocityCommand,
    VelocityCommandWithOscillators,
    ImpedanceCommand,
    Oscillator,
} from './commands.js';

/**
 * All available observation components
 * 
 * All policies now use modern atomic components!
 * Legacy monolithic components (HIMLocoObs, DecapObs, G1VelocityObs) are kept
 * only for reference and backwards compatibility if needed.
 */
export const Observations = {
    // ===== ATOMIC COMPONENTS (Production) =====
    // Base state observations
    BaseLinearVelocity,
    BaseAngularVelocity,
    ProjectedGravity,
    
    // Joint observations
    JointPositions,
    JointVelocities,
    PreviousActions,
    
    // Commands
    SimpleVelocityCommand,
    VelocityCommand,
    VelocityCommandWithOscillators,
    ImpedanceCommand,
    Oscillator
};

// Default export for convenience
export default Observations;
