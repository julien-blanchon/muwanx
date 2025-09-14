<template>
    <div id="mujoco-container">
        <!-- this is for placing the background demo -->
    </div>
    <div style="position: fixed; top: 20px; right: 20px; z-index: 1000; width: 400px;">
        <v-card>
            <v-tabs v-model="task" bg-color="primary" @update:modelValue="updateTaskCallback()">
                <v-tab value="1">Go2</v-tab>
                <v-tab value="2">Go1</v-tab>
            </v-tabs>

            <v-tabs-window v-model="task">
                <v-tabs-window-item value="1">
                    <v-tabs v-model="policy" bg-color="primary" @update:modelValue="updatePolicyCallback()">
                        <v-tab value="facet">Facet</v-tab>
                        <v-tab value="robust">Robust</v-tab>
                        <v-tab value="vanilla">Vanilla</v-tab>
                    </v-tabs>

                    <v-tabs-window v-model="policy">
                        <v-tabs-window-item value="facet">
                            <!-- Command Controls Group -->
                            <v-card-text>
                                <div class="text-subtitle-2 mb-2">Target Controls</div>
                                <v-checkbox :disabled="compliant_mode" v-model="use_setpoint" @update:modelValue="updateUseSetpointCallback()"
                                    density="compact" hide-details>
                                    <template v-slot:label>
                                        <p style="line-height: 1.0;">
                                            Use Setpoint
                                            <br />
                                            <span class="text-caption text-grey" v-if="use_setpoint"
                                                style="line-height: 1.0;">
                                                Drag the red sphere to command target positions
                                            </span>
                                            <span class="text-caption text-grey" v-if="!use_setpoint"
                                                style="line-height: 1.0;">
                                                Slide to command target velocities
                                            </span>
                                        </p>
                                    </template>
                                </v-checkbox>
                                <v-slider :disabled="use_setpoint || compliant_mode" v-model="command_vel_x" :min="-0.5"
                                    :max="1.5" :step="0.1" label="velocity" hide-details
                                    @update:modelValue="updateCommandVelXCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ command_vel_x }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>
                            <v-divider></v-divider>
                            <!-- Stiffness Controls Group -->
                            <v-card-text>
                                <div class="text-subtitle-2 mb-2">Stiffness Controls</div>
                                <v-checkbox v-model="compliant_mode" @update:modelValue="updateCompliantModeCallback()"
                                    density="compact" hide-details>
                                    <template v-slot:label>
                                        <p style="line-height: 1.0;">
                                            Compliant Mode <br />
                                            <span class="text-caption text-grey" v-if="compliant_mode"
                                                style="line-height: 1.0;">
                                                Stiffness is set to 0
                                            </span>
                                            <span class="text-caption text-grey" v-if="!compliant_mode"
                                                style="line-height: 1.0;">
                                                Slide to set stiffness
                                            </span>
                                        </p>
                                    </template>
                                </v-checkbox>

                                <v-slider :disabled="compliant_mode" v-model="facet_kp" :min="0" :max="24" :step="1"
                                    label="stiffness" hide-details @update:modelValue="updateFacetKpCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ facet_kp }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>

                        </v-tabs-window-item>

                        <v-tabs-window-item value="robust">
                            <!-- add instructions -->
                            <v-card-text>
                                <div class="text-caption text-grey mb-2">
                                    Slide to set command velocity
                                </div>
                                <v-slider v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1" label="velocity"
                                    hide-details @update:modelValue="updateCommandVelXCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ command_vel_x }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>
                        </v-tabs-window-item>

                        <v-tabs-window-item value="vanilla">
                            <!-- add instructions -->
                            <v-card-text>
                                <div class="text-caption text-grey mb-2">
                                    Slide to set command velocity
                                </div>
                                <v-slider v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1" label="velocity"
                                    hide-details @update:modelValue="updateCommandVelXCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ command_vel_x }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>
                        </v-tabs-window-item>
                    </v-tabs-window>

                    <v-divider></v-divider>

                    <!-- Force Controls Group -->
                    <v-card-text class="pb-2">
                        <div class="text-subtitle-2 mb-2">Force Controls</div>
                        <div class="text-caption text-grey mb-2">
                            Drag on the robot to apply force
                        </div>
                        <v-btn @click="StartImpulse" color="primary" block>Impulse</v-btn>
                        <div class="text-caption text-grey mb-2">
                            Click the button to apply an impulse
                        </div>
                    </v-card-text>
                </v-tabs-window-item>

                <v-tabs-window-item value="2">
                    <v-tabs v-model="policy" bg-color="primary" @update:modelValue="updatePolicyCallback()">
                        <v-tab value="him">HIMLoco</v-tab>
                        <v-tab value="decap">Decap</v-tab>
                    </v-tabs>

                    <v-tabs-window v-model="policy">
                        <v-tabs-window-item value="him">
                            <v-card-text>
                                <div class="text-caption text-grey mb-2">
                                    Slide to set command velocity
                                </div>
                                <v-slider v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1" label="velocity"
                                    hide-details @update:modelValue="updateCommandVelXCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ command_vel_x }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>
                        </v-tabs-window-item>

                        <v-tabs-window-item value="decap">
                            <v-card-text>
                                <div class="text-caption text-grey mb-2">
                                    Slide to set command velocity
                                </div>
                                <v-slider v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1" label="velocity"
                                    hide-details @update:modelValue="updateCommandVelXCallback()">
                                    <template v-slot:append>
                                        <div class="text-caption">{{ command_vel_x }}</div>
                                    </template>
                                </v-slider>
                            </v-card-text>
                        </v-tabs-window-item>
                    </v-tabs-window>

                    <v-divider></v-divider>

                    <!-- Force Controls Group -->
                    <v-card-text class="pb-2">
                        <div class="text-subtitle-2 mb-2">Force Controls</div>
                        <div class="text-caption text-grey mb-2">
                            Drag on the robot to apply force
                        </div>
                        <v-btn @click="StartImpulse" color="primary" block>Impulse</v-btn>
                        <div class="text-caption text-grey mb-2">
                            Click the button to apply an impulse
                        </div>
                    </v-card-text>
                </v-tabs-window-item>
            </v-tabs-window>

            <!-- add reset button -->
            <v-btn @click="reset" block text tile>Reset</v-btn>
        </v-card>
    </div>
    <v-dialog :model-value="state === 0" persistent max-width="600px" scrollable>
        <v-card title="Loading Simulation Environment">
            <v-card-text>
                <v-progress-linear indeterminate color="primary"></v-progress-linear>
                Loading MuJoCo and ONNX, please wait
            </v-card-text>
        </v-card>
    </v-dialog>
    <v-dialog :model-value="state < 0" persistent max-width="600px" scrollable>
        <v-card title="Simulation Environment Loading Error">
            <v-card-text>
                <span v-if="state == -1"> Unexpected JS error, please refresh the page <br /> {{ extra_error_message }}
                </span>
                <span v-if="state == -2"> Your browser does not support WebAssembly, please use latest
                    Chrome/Edge/Firefox </span>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Notice -->
    <div style="position: fixed; bottom: 12px; left: 12px; z-index: 1000;">
        <div style="background: transparent; color: rgba(255,255,255,0.95); padding: 10px 16px; border-radius: 4px; font-size: 14px; font-weight: 500; backdrop-filter: none; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">
            Powered by <a href="https://github.com/ttktjmt/muwanx" target="_blank" style="color: #8DDFFB; text-decoration: none;">Muwanx</a>
        </div>
    </div>

</template>


<script>

import { MuJoCoDemo } from '@/mujoco_wasm/examples/main.js';
import load_mujoco from '@/mujoco_wasm/dist/mujoco_wasm.js';

const tasks = {
    "1": ["unitree_go2/scene.xml", "./examples/checkpoints/go2/asset_meta.json"],
    "2": ["unitree_go1/go1.xml", "./examples/checkpoints/go1/asset_meta.json"],
}

const default_policy = {
    "1": "facet",
    "2": "him",
}

const policies = {
    "facet": "./examples/checkpoints/policy-05-03_21-31.json",
    "robust": "./examples/checkpoints/robust.json",
    "vanilla": "./examples/checkpoints/vanilla.json",
    "him": "./examples/checkpoints/go1/go1_him.json",
    "decap": "./examples/checkpoints/go1/go1_decap.json",
}

export default {
    name: 'DemoPage',
    data: () => ({
        task: '1',
        policy: 'facet',
        facet_kp: 24,
        command_vel_x: 0.0,
        use_setpoint: true,
        compliant_mode: false,
        state: 0, // 0: loading, 1: running, -1: error by js, -2: error by wasm
        extra_error_message: "",
        keydown_listener: null,
    }),
    methods: {
        async init() {
            // check if browser supports WebAssembly
            if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") {
                this.state = -2;
                return;
            }

            try {
                const mujoco = await load_mujoco();
                this.demo = new MuJoCoDemo(mujoco);
                await this.demo.init();
                this.demo.main_loop();
                this.demo.params["paused"] = false;
                this.state = 1;
            } catch (error) {
                this.state = -1;
                this.extra_error_message = error.toString();
                console.error(error);
            }
        },
        async updateTaskCallback() {
            if (this.task === "3" || this.task === "4") {
                return;
            }
            console.log(this.task);
            this.demo.alive = false;
            const mjcf_path = tasks[this.task][0];
            const meta_path = tasks[this.task][1];
            this.policy = default_policy[this.task];
            await this.demo.reloadScene(mjcf_path, meta_path);
            this.updatePolicyCallback();
        },
        async updatePolicyCallback() {
            console.log(this.policy);
            this.demo.alive = false;
            await this.demo.reloadPolicy(policies[this.policy]);
            if (this.policy === "facet") {
                this.demo.ball.visible = true;
                this.demo.ball.position.set(0, 0.5, 0);
            } else {
                this.demo.ball.visible = false;
            }
            this.demo.alive = true;
            this.demo.main_loop();
        },
        reset() {
            this.demo.params["paused"] = true;
            this.demo.simulation.resetData();
            this.demo.simulation.forward();
            this.demo.ball.position.set(0, 0.5, 0);
            this.demo.params["paused"] = false;
        },
        updateFacetKpCallback() {
            this.facet_kp = Math.max(this.facet_kp, 12);
            this.facet_kp = Math.min(this.facet_kp, 24);
            this.demo.params["impedance_kp"] = this.facet_kp;
        },
        updateUseSetpointCallback() {
            console.log("use stepoint", this.use_setpoint);
            this.demo.params["use_setpoint"] = this.use_setpoint;
            if (this.use_setpoint) {
                this.command_vel_x = 0.0;
                this.updateCommandVelXCallback();
            }
        },
        updateCommandVelXCallback() {
            console.log("set command vel x", this.command_vel_x);
            this.demo.params["command_vel_x"] = this.command_vel_x;
        },
        updateCompliantModeCallback() {
            this.demo.params["compliant_mode"] = this.compliant_mode;
            if (this.compliant_mode) {
                this.facet_kp = 0;
                this.command_vel_x = 0.0;
                this.demo.params["impedance_kp"] = this.facet_kp;
            } else {
                this.facet_kp = 24;
                this.demo.params["impedance_kp"] = this.facet_kp;
            }
        },
        StartImpulse() {
            console.log("start impulse");
            this.demo.params["impulse_remain_time"] = 0.1;
        },
    },
    mounted() {
        this.init();
        this.keydown_listener = document.addEventListener('keydown', (event) => {
            if (event.code === 'Backspace') {
                this.reset();
            }
        });
    },
    beforeUnmount() {
        // this.stopPlotUpdates();
        document.removeEventListener('keydown', this.keydown_listener);
    }
}
</script>

<style scoped>
.v-card {
    transition: transform 0.2s;
}

.v-card:hover {
    transform: translateY(-2px);
}
</style>