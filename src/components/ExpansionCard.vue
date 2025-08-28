<!-- src/components/ExpansionCard.vue -->
<template>
    <v-card class="mb-4 h-100 d-flex flex-column">
        <!-- Media Slot -->
        <div class="flex-grow-0"> <!-- 不准变长！ -->
            <slot name="media">
                <v-img height="300" contain class="grey lighten-3"></v-img>
            </slot>
        </div>

        <!-- Title & Subtitle -->
        <v-card-title class="text-h6 flex-grow-0">
            <slot name="title" />
        </v-card-title>
        <v-card-text class="text-subtitle-1 flex-grow-0">
            <slot name="subtitle" />
        </v-card-text>

        <!-- Expandable Content -->
        <v-expand-transition>
            <div v-show="expanded">
                <v-divider />
                <v-card-text>
                    <slot />
                </v-card-text>
            </div>
        </v-expand-transition>

        <!-- Actions -->
        <v-card-actions class="mt-auto">
            <v-spacer />
            <v-btn text color="primary" @click="toggle">
                {{ expanded ? 'Show Less' : 'Show More' }}
                <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
    /** Controls whether the content is expanded or collapsed */
    expanded: {
        type: Boolean,
        default: false
    }
})
const emit = defineEmits(['update:expanded'])

function toggle() {
    emit('update:expanded', !props.expanded)
}
</script>
