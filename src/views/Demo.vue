<template>
    <div id="mujoco-container" class="mujoco-container">
        <!-- this is for placing the background demo -->
    </div>

    <div class="control-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
        <!-- Toggle button for mobile -->
        <v-btn v-if="isMobile" class="panel-toggle" @click="togglePanel" icon size="small" color="primary"
            elevation="2">
            <v-icon>{{ isPanelCollapsed ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>

        <v-card class="control-card" :elevation="isMobile ? 0 : 2">
            <!-- Model/Task tabs with click handler -->
            <v-tabs v-model="task" bg-color="primary" @update:modelValue="updateTaskCallback()"
                :density="isMobile ? 'compact' : 'default'" class="tabs-container">
                <v-tab v-for="task in config.tasks" :key="task.id" :value="task.id" 
                    :class="{ 'mobile-tab': isMobile }" @click="handleTaskTabClick(task.id)">
                    {{ task.name }}
                </v-tab>
            </v-tabs>

            <v-tabs-window v-model="task">
                <v-tabs-window-item v-for="task in config.tasks" :key="task.id" :value="task.id">
                    <template v-if="task.policies?.length">
                        <!-- Policy tabs with click handler -->
                        <v-tabs v-model="policy" bg-color="primary" @update:modelValue="updatePolicyCallback()"
                            :density="isMobile ? 'compact' : 'default'">
                            <v-tab v-for="policy in task.policies" :key="policy.id" :value="policy.id"
                                :class="{ 'mobile-tab': isMobile }" @click="handlePolicyTabClick(policy.id)">
                                {{ policy.name }}
                            </v-tab>
                        </v-tabs>

                        <!-- Policy-specific contents -->
                        <v-tabs-window v-model="policy">
                            <v-tabs-window-item v-for="policy in task.policies" :key="policy.id" :value="policy.id">
                                <!-- Command Controls Group -->
                                <v-card-text :class="{ 'mobile-padding': isMobile }">
                                    <div class="control-section-title">Target Controls</div>

                                    <!-- Setpoint checkbox -->
                                    <v-checkbox v-if="policy.ui_controls && policy.ui_controls.includes('setpoint')"
                                        :disabled="compliant_mode" v-model="use_setpoint"
                                        @update:modelValue="updateUseSetpointCallback()"
                                        :density="isMobile ? 'compact' : 'default'" hide-details class="mobile-checkbox">
                                        <template v-slot:label>
                                            <div class="checkbox-label">
                                                <span class="label-text">Use Setpoint</span>
                                                <span class="label-description">
                                                    <span v-if="use_setpoint">
                                                        Drag the red sphere to command target positions
                                                    </span>
                                                    <span v-else>
                                                        Slide to command target velocities
                                                    </span>
                                                </span>
                                            </div>
                                        </template>
                                    </v-checkbox>

                                    <!-- Velocity slider -->
                                    <div class="slider-section">
                                        <div class="slider-label">Slide to set command velocity</div>
                                        <v-slider
                                            :disabled="use_setpoint && policy.ui_controls && policy.ui_controls.includes('setpoint') && compliant_mode"
                                            v-model="command_vel_x" :min="-0.5" :max="1.5" :step="0.1"
                                            :thumb-size="isMobile ? 20 : 16" :track-size="isMobile ? 6 : 4" hide-details
                                            @update:modelValue="updateCommandVelXCallback()" class="mobile-slider">
                                            <template v-slot:append>
                                                <div class="slider-value">{{ command_vel_x }}</div>
                                            </template>
                                        </v-slider>
                                    </div>
                                </v-card-text>

                                <!-- Stiffness Controls Group -->
                                <v-divider
                                    v-if="policy.ui_controls && policy.ui_controls.includes('stiffness')"></v-divider>
                                <v-card-text v-if="policy.ui_controls && policy.ui_controls.includes('stiffness')"
                                    :class="{ 'mobile-padding': isMobile }">
                                    <div class="control-section-title">Stiffness Controls</div>

                                    <v-checkbox v-model="compliant_mode" @update:modelValue="updateCompliantModeCallback()"
                                        :density="isMobile ? 'compact' : 'default'" hide-details class="mobile-checkbox">
                                        <template v-slot:label>
                                            <div class="checkbox-label">
                                                <span class="label-text">Compliant Mode</span>
                                                <span class="label-description">
                                                    <span v-if="compliant_mode">
                                                        Stiffness is set to 0
                                                    </span>
                                                    <span v-else>
                                                        Slide to set stiffness
                                                    </span>
                                                </span>
                                            </div>
                                        </template>
                                    </v-checkbox>

                                    <div class="slider-section">
                                        <v-slider :disabled="compliant_mode" v-model="facet_kp" :min="0" :max="24" :step="1"
                                            :thumb-size="isMobile ? 20 : 16" :track-size="isMobile ? 6 : 4" hide-details
                                            @update:modelValue="updateFacetKpCallback()" class="mobile-slider">
                                            <template v-slot:append>
                                                <div class="slider-value">{{ facet_kp }}</div>
                                            </template>
                                        </v-slider>
                                    </div>
                                </v-card-text>
                            </v-tabs-window-item>
                        </v-tabs-window>
                    </template>
                    <v-card-text v-else :class="{ 'mobile-padding': isMobile }" class="no-policy-message">
                        <div class="control-section-title">Policy Controls</div>
                        <div class="force-description">
                            No policy is configured for this task. The simulation runs with default joint targets only.
                        </div>
                    </v-card-text>

                    <!-- Force Controls Group -->
                    <v-divider></v-divider>
                    <v-card-text :class="{ 'mobile-padding': isMobile, 'pb-2': !isMobile }">
                        <div class="control-section-title">Force Controls</div>
                        <div class="force-description">
                            Drag on the robot to apply force
                        </div>
                        <template v-if="task.name === 'Go2'">
                            <v-btn @click="StartImpulse" color="primary" block :size="isMobile ? 'large' : 'default'"
                                class="impulse-button">
                                Impulse
                            </v-btn>
                            <div class="force-description">
                                Click the button to apply an impulse
                            </div>
                        </template>
                    </v-card-text>
                </v-tabs-window-item>
            </v-tabs-window>

            <!-- Reset button -->
            <v-btn @click="reset" block text :size="isMobile ? 'large' : 'default'" class="reset-button">
                Reset
            </v-btn>
        </v-card>
    </div>

    <!-- Loading dialog - mobile responsive -->
    <v-dialog :model-value="state === 0" persistent :max-width="isMobile ? '90vw' : '600px'"
        :fullscreen="isMobile && isSmallScreen" scrollable>
        <v-card :title="!isMobile ? 'Loading Simulation Environment' : undefined">
            <v-card-text class="dialog-content">
                <div v-if="isMobile" class="mobile-dialog-title">Loading...</div>
                <v-progress-linear indeterminate color="primary" class="mb-4"></v-progress-linear>
                <div class="loading-text">
                    <span v-if="isMobile">
                        Loading MuJoCo and ONNX,<br/>Please wait...
                    </span>
                    <span v-else>
                        Loading MuJoCo and ONNX, Please wait...
                    </span>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Error dialog - mobile responsive -->
    <v-dialog :model-value="state < 0" persistent :max-width="isMobile ? '90vw' : '600px'"
        :fullscreen="isMobile && isSmallScreen" scrollable>
        <v-card :title="isMobile ? 'Error' : 'Simulation Environment Loading Error'">
            <v-card-text class="dialog-content">
                <div class="error-text">
                    <span v-if="state == -1">
                        Unexpected JS error, please refresh the page
                        <br />
                        {{ extra_error_message }}
                    </span>
                    <span v-if="state == -2">
                        Your browser does not support WebAssembly, please use latest Chrome/Edge/Firefox
                    </span>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Notice - mobile responsive -->
    <div class="notice-container">
        <div class="notice-content">
            Powered by
            <a href="https://github.com/ttktjmt/muwanx" target="_blank" class="notice-link">
                Muwanx
            </a>
        </div>
    </div>
</template>

<script>
import { MujocoRuntime, GoCommandManager, IsaacActionManager, ConfigObservationManager, LocomotionEnvManager } from '@/mujoco_wasm/examples/main.js';
import load_mujoco from '@/mujoco_wasm/dist/mujoco_wasm.js';
import { markRaw } from 'vue';

export default {
    name: 'DemoPage',
    data: () => ({
        config: { tasks: [] },
        task: null,
        policy: null,
        facet_kp: 24,
        command_vel_x: 0.0,
        use_setpoint: true,
        compliant_mode: false,
        state: 0,
        extra_error_message: "",
        keydown_listener: null,
        runtime: null,
        commandManager: null,
        actionManager: null,
        observationManager: null,
        envManager: null,
        // Mobile responsive data
        isMobile: false,
        isSmallScreen: false,
        isPanelCollapsed: false,
    }),
    methods: {
        resolveDefaultPolicy(task) {
            if (!task) return null;
            if (task.default_policy !== null && task.default_policy !== undefined) {
                return task.default_policy;
            }
            return task.policies?.[0]?.id ?? null;
        },
        applyCommandState() {
            if (!this.commandManager) {
                return;
            }
            this.commandManager.setUseSetpoint(this.use_setpoint);
            this.commandManager.setCompliantMode(this.compliant_mode);
            this.commandManager.setImpedanceKp(this.facet_kp);
            this.commandManager.setCommandVelocityX(this.command_vel_x);
            const params = this.runtime?.params;
            if (params) {
                this.facet_kp = params.impedance_kp;
                this.command_vel_x = params.command_vel_x;
            }
        },
        checkMobileDevice() {
            this.isMobile = window.innerWidth <= 768;
            this.isSmallScreen = window.innerWidth <= 480;
            this.isPanelCollapsed = this.isMobile; // Start collapsed on mobile
        },
        togglePanel() {
            this.isPanelCollapsed = !this.isPanelCollapsed;
        },
        async init() {
            if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") {
                this.state = -2;
                return;
            }
            try {
                await this.loadConfig();
                console.log(this.config);
                if (!this.config.tasks.length) return;
                const mujoco = await load_mujoco();
                this.commandManager = markRaw(new GoCommandManager());
                this.actionManager = markRaw(new IsaacActionManager());
                this.observationManager = markRaw(new ConfigObservationManager());
                this.envManager = markRaw(new LocomotionEnvManager());

                const initialTask = this.config.tasks[0];
                const initialPolicy = initialTask.policies.find(p => p.id === initialTask.default_policy) ?? initialTask.policies[0];

                this.runtime = markRaw(new MujocoRuntime(mujoco, {
                    commandManager: this.commandManager,
                    actionManager: this.actionManager,
                    observationManagers: [this.observationManager],
                    envManagers: [this.envManager],
                }));

                await this.runtime.init({
                    scenePath: initialTask.model_xml,
                    metaPath: initialTask.asset_meta,
                    policyPath: initialPolicy?.path,
                });
                this.updateFacetballService(initialPolicy);
                this.runtime.resume();
                this.applyCommandState();
                this.state = 1;
            } catch (error) {
                this.state = -1;
                this.extra_error_message = error.toString();
                console.error(error);
            }
        },
        async loadConfig() {
            try {
                const response = await fetch('./config.json');
                this.config = await response.json();
                const firstTask = this.config.tasks[0];
                this.task = firstTask?.id ?? null;
                this.policy = this.resolveDefaultPolicy(firstTask);
            } catch (error) {
                console.error('Failed to load config:', error);
                this.state = -1;
                this.extra_error_message = 'Config load failed: ' + error;
            }
        },
        async updateTaskCallback() {
            const selectedTask = this.config.tasks.find(t => t.id === this.task);
            if (!selectedTask) return;

            this.policy = this.resolveDefaultPolicy(selectedTask);
            if (!this.runtime) return;
            const selectedPolicy = selectedTask.policies.find(p => p.id === this.policy);
            await this.runtime.loadEnvironment({
                scenePath: selectedTask.model_xml,
                metaPath: selectedTask.asset_meta,
                policyPath: selectedPolicy?.path,
            });
            this.updateFacetballService(selectedPolicy);
            this.runtime.resume();
            this.applyCommandState();
        },
        async updatePolicyCallback() {
            const selectedTask = this.config.tasks.find(t => t.id === this.task);
            const selectedPolicy = selectedTask.policies.find(p => p.id === this.policy);
            if (!selectedPolicy) return;

            if (!this.runtime) return;
            await this.runtime.stop();
            await this.runtime.loadPolicy(selectedPolicy.path);
            this.runtime.startLoop();
            this.runtime.resume();
            this.updateFacetballService(selectedPolicy);
            this.applyCommandState();
        },
        async reloadDefaultPolicyAndResetSimulation() {
            if (!this.runtime) return;
            
            const selectedTask = this.config.tasks.find(t => t.id === this.task);
            if (!selectedTask) return;

            this.policy = this.resolveDefaultPolicy(selectedTask);
            const defaultPolicy = selectedTask.policies.find(p => p.id === this.policy);

            try {
                if (defaultPolicy) {
                    await this.runtime.stop();
                    await this.runtime.loadPolicy(defaultPolicy.path);
                    this.runtime.startLoop();
                } else {
                    await this.runtime.loadEnvironment({
                        scenePath: selectedTask.model_xml,
                        metaPath: selectedTask.asset_meta,
                    });
                }
                this.runtime.resume();
                this.updateFacetballService(defaultPolicy);

                // Reset simulation after loading default policy or environment
                await this.runtime.reset();
                this.applyCommandState();
            } catch (error) {
                console.error('Failed to reload default policy and reset simulation:', error);
            }
        },
        updateFacetballService(selectedPolicy) {
            if (!this.runtime) return;
            const setpointService = this.runtime.getService?.('setpoint-control');
            if (!setpointService) return;
            const policyId = selectedPolicy?.id ?? this.policy ?? null;
            setpointService.setActivePolicy?.(policyId);
            const showSetpoint = selectedPolicy?.show_setpoint ?? (policyId === 'facet');
            setpointService.setVisible?.(showSetpoint || this.use_setpoint);
            if (showSetpoint) {
                setpointService.reset?.();
            }
        },
        async resetSimulation() {
            if (!this.runtime) return;
            
            try {
                await this.runtime.reset();
                this.applyCommandState();
            } catch (error) {
                console.error('Failed to reset simulation:', error);
            }
        },
        async reset() {
            if (!this.runtime) return;
            await this.runtime.reset();
            this.applyCommandState();
        },
        updateFacetKpCallback() {
            this.facet_kp = Math.max(this.facet_kp, 12);
            this.facet_kp = Math.min(this.facet_kp, 24);
            if (!this.commandManager) return;
            this.commandManager.setImpedanceKp(this.facet_kp);
            this.facet_kp = this.runtime?.params?.impedance_kp ?? this.facet_kp;
        },
        updateUseSetpointCallback() {
            console.log("use setpoint", this.use_setpoint);
            if (!this.commandManager) return;
            this.commandManager.setUseSetpoint(this.use_setpoint);
            if (this.use_setpoint) {
                this.command_vel_x = 0.0;
                this.commandManager.setCommandVelocityX(this.command_vel_x);
            }
        },
        updateCommandVelXCallback() {
            console.log("set command vel x", this.command_vel_x);
            if (!this.commandManager) return;
            this.commandManager.setCommandVelocityX(this.command_vel_x);
        },
        updateCompliantModeCallback() {
            if (!this.commandManager) return;
            this.commandManager.setCompliantMode(this.compliant_mode);
            this.facet_kp = this.runtime?.params?.impedance_kp ?? this.facet_kp;
        },
        StartImpulse() {
            console.log("start impulse");
            if (!this.commandManager) return;
            this.commandManager.triggerImpulse();
        },
        handleResize() {
            this.checkMobileDevice();
        },
        handleTaskTabClick(clickedTaskId) {
            // If clicking the same task tab that's already active
            if (this.task === clickedTaskId) {
                this.reloadDefaultPolicyAndResetSimulation();
            }
        },
        handlePolicyTabClick(clickedPolicyId) {
            // If clicking the same policy tab that's already active
            if (this.policy === clickedPolicyId) {
                this.resetSimulation();
            }
        },
    },
    mounted() {
        this.checkMobileDevice();
        this.init();

        // Add resize listener
        window.addEventListener('resize', this.handleResize);

        this.keydown_listener = (event) => {
            if (event.code === 'Backspace') {
                this.reset();
            }
        };
        document.addEventListener('keydown', this.keydown_listener);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.handleResize);
        if (this.keydown_listener) {
            document.removeEventListener('keydown', this.keydown_listener);
        }
    },
};
</script>

<style scoped>
.mujoco-container {
    width: 100%;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;
}

/* Control Panel Styles */
.control-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    z-index: 1000;
    transition: all 0.3s ease;
}

/* Mobile Control Panel */
@media (max-width: 768px) {
    .control-panel {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 70vh;
        transform: translateY(0);
        border-radius: 16px 16px 0 0;
        background: white;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    }

    .control-panel.panel-collapsed {
           transform: translateY(calc(100% - 36px)); /* Show only the model controls */
    }
}

@media (max-width: 480px) {
    .control-panel {
        max-height: 80vh;
    }

    .control-panel.panel-collapsed {
           transform: translateY(calc(100% - 36px));
    }
}

.panel-toggle {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
}

.control-card {
    transition: transform 0.2s;
    overflow-y: auto;
    max-height: 100%;
}

@media (max-width: 768px) {
    .control-card {
        border-radius: 16px 16px 0 0;
        box-shadow: none;
    }
}

.control-card:hover {
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .control-card:hover {
        transform: none;
    }
}

/* Tab Styles */
.tabs-container {
    border-radius: 8px 8px 0 0;
}

.mobile-tab {
    min-width: 80px;
    font-size: 0.875rem;
}

/* Content Styles */
.mobile-padding {
    padding: 12px 16px !important;
}

.control-section-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.87);
}

.checkbox-label {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.label-text {
    font-weight: 500;
    margin-bottom: 4px;
}

.label-description {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    line-height: 1.3;
}

.mobile-checkbox {
    margin-bottom: 8px;
}

/* Slider Styles */
.slider-section {
    margin-top: 12px;
}

.no-policy-message {
    padding-top: 16px !important;
    padding-bottom: 16px !important;
}

.slider-label {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 8px;
}

.mobile-slider {
    margin-bottom: 8px;
}

.slider-value {
    font-size: 0.75rem;
    font-weight: 500;
    min-width: 40px;
    text-align: center;
}

/* Force Controls */
.force-description {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 12px;
    text-align: center;
}

.impulse-button {
    margin: 8px 0;
}

.reset-button {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 0;
}

@media (max-width: 768px) {
    .reset-button {
        padding: 16px;
    }
}

/* Dialog Styles */
.dialog-content {
    text-align: center;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100px;
}

@media (max-width: 768px) {
    .dialog-content {
        /* Full height for mobile fullscreen dialogs */
        min-height: 60vh;
        height: 60vh;
        padding: 10px;
        justify-content: center;
    }
    
    /* Center the card title on mobile */
    .v-card-title {
        text-align: center !important;
        justify-content: center !important;
    }
    
    /* Style for mobile dialog title positioned above progress bar */
    .mobile-dialog-title {
        text-align: left;
        font-size: 1.25rem;
        font-weight: 500;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.87);
    }
}

.loading-text,
.error-text {
    justify-content: center;
    font-size: 0.95rem;
    line-height: 1.5;
}

/* Notice Styles */
.notice-container {
    position: fixed;
    bottom: 12px;
    left: 12px;
    z-index: 999;
}

@media (max-width: 768px) {
    .notice-container {
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        bottom: auto;
    }
}


.notice-content {
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    /* more transparent */
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
}

@media (max-width: 480px) {
    .notice-content {
        font-size: 12px;
        padding: 6px 10px;
    }
}

.notice-link {
    color: #8DDFFB;
    text-decoration: none;
}

.notice-link:hover {
    text-decoration: underline;
}
</style>
