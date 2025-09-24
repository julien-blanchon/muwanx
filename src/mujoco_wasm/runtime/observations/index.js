import { VelocityCommand, ImpedanceCommand } from './commands.js';
import { BaseAngVelMultistep, GravityMultistep, JointPosMultistep, JointVelMultistep, PrevActions } from './histories.js';
import { HIMLocoObs } from './himLoco.js';
import { DecapObs } from './decap.js';

export const Observations = {
    VelocityCommand,
    ImpedanceCommand,
    BaseAngVelMultistep,
    GravityMultistep,
    JointPosMultistep,
    JointVelMultistep,
    PrevActions,
    HIMLocoObs,
    DecapObs,
};
