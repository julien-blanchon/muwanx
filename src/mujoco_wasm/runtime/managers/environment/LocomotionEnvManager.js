import * as THREE from 'three';
import { BaseManager } from '../BaseManager.js';
import { DragStateManager } from '../../../examples/utils/DragStateManager.js';
import { getPosition, getQuaternion, toMujocoPos } from '../../utils/mujocoScene.js';

export class LocomotionEnvManager extends BaseManager {
    constructor(options = {}) {
        super();
        this.options = options;
        this.ballHeight = options.ballHeight ?? 0.5;
        this.dragForceScale = options.dragForceScale ?? 25;
        this.impulseForce = options.impulseForce ?? new THREE.Vector3(0, 50, 0);
        this.serviceName = options.serviceName ?? 'setpoint-control';
        this.defaultBallPosition = new THREE.Vector3(0, this.ballHeight, 0);
    }

    onRuntimeAttached(runtime) {
        this.scene = runtime.scene;
        this.camera = runtime.camera;
        this.renderer = runtime.renderer;
        this.controls = runtime.controls;
        this.container = runtime.container.parentElement;
        this.createSetpointBall();
        this.dragStateManager = new DragStateManager(this.scene, this.renderer, this.camera, this.container, this.controls);
        runtime.registerService(this.serviceName, this.createServiceInterface());
    }

    createSetpointBall() {
        const ballGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const ballMaterial = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            metalness: 0.2,
            roughness: 0.2,
        });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.copy(this.defaultBallPosition);
        this.ball.castShadow = true;
        this.ball.bodyID = 'setpoint';
        this.scene.add(this.ball);
        this.runtime.ball = this.ball;
    }

    createServiceInterface() {
        return {
            ball: this.ball,
            setVisible: (visible) => {
                this.ball.visible = visible;
            },
            setPosition: (x, y, z) => {
                this.ball.position.set(x, y, z);
            },
            reset: () => {
                this.ball.position.copy(this.defaultBallPosition);
            },
            onSetpointEnabled: () => {
                this.ball.visible = true;
            },
            onSetpointDisabled: () => {
                this.ball.visible = false;
            },
            onCompliantModeChange: (flag, kp) => {
                if (flag) {
                    this.ball.visible = false;
                } else if (this.runtime?.params?.use_setpoint) {
                    this.ball.visible = true;
                } else {
                    this.ball.visible = false;
                }
            },
            onImpedanceChange: () => {},
            onImpulseTriggered: () => {},
        };
    }

    async onSceneLoaded({ model, simulation }) {
        this.model = model;
        this.simulation = simulation;
        this.runtime.mujocoRoot = this.runtime.scene.getObjectByName('MuJoCo Root');
        this.ball.position.copy(this.defaultBallPosition);

        this.pelvisBodyId = null;
        for (let b = 0; b < model.nbody; b++) {
            const body = this.runtime.bodies?.[b];
            if (body && body.name === 'base') {
                this.pelvisBodyId = b;
                break;
            }
        }
    }

    beforeSimulationStep() {
        if (!this.simulation) {
            return;
        }
        for (let i = 0; i < this.simulation.qfrc_applied.length; i++) {
            this.simulation.qfrc_applied[i] = 0.0;
        }

        const dragged = this.dragStateManager.physicsObject;
        if (dragged && dragged.bodyID) {
            for (let b = 0; b < this.model.nbody; b++) {
                if (this.runtime.bodies[b]) {
                    getPosition(this.simulation.xpos, b, this.runtime.bodies[b].position);
                    getQuaternion(this.simulation.xquat, b, this.runtime.bodies[b].quaternion);
                    this.runtime.bodies[b].updateWorldMatrix();
                }
            }
            this.dragStateManager.update();
            if (this.dragStateManager.physicsObject) {
                if (this.dragStateManager.physicsObject.bodyID === 'setpoint') {
                    this.ball.position.x = this.dragStateManager.currentWorld.x;
                    this.ball.position.z = this.dragStateManager.currentWorld.z;
                } else {
                    const force = toMujocoPos(this.dragStateManager.offset.clone().multiplyScalar(this.dragForceScale));
                    const point = toMujocoPos(this.dragStateManager.worldHit.clone());
                    this.simulation.applyForce(
                        force.x, force.y, force.z,
                        0, 0, 0,
                        point.x, point.y, point.z,
                        this.dragStateManager.physicsObject.bodyID
                    );
                }
            }
        }

        if (this.runtime.params.impulse_remain_time > 0 && this.pelvisBodyId !== null) {
            const point = new THREE.Vector3();
            getPosition(this.simulation.xpos, this.pelvisBodyId, point, false);
            this.simulation.applyForce(
                this.impulseForce.x,
                this.impulseForce.y,
                this.impulseForce.z,
                0, 0, 0,
                point.x, point.y, point.z,
                this.pelvisBodyId
            );
            this.runtime.params.impulse_remain_time -= this.runtime.timestep;
        }
    }

    dispose() {
        if (this.ball) {
            this.scene.remove(this.ball);
            this.ball.geometry.dispose();
            this.ball.material.dispose();
        }
        if (this.dragStateManager) {
            this.dragStateManager.dispose?.();
        }
        this.runtime.unregisterService(this.serviceName);
    }

    reset() {
        this.ball.position.copy(this.defaultBallPosition);
    }
}
