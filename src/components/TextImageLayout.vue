<template>
    <v-row class="text-image-layout">
        <!-- Text Column (Order changes based on reverse prop) -->
        <v-col :order="reverse ? 'last' : 'first'" :cols="12" :lg="textColSize" class="text-col pa-4">
            <slot name="text"></slot>
        </v-col>

        <!-- Image Column (Order changes based on reverse prop) -->
        <v-col :order="reverse ? 'first' : 'last'" :cols="12" :lg="12 - textColSize" class="image-col">
            <slot name="image"></slot>
        </v-col>
    </v-row>
</template>

<script>
export default {
    name: 'TextImageLayout',
    props: {
        // Controls whether text appears on the right (true) or left (false)
        reverse: {
            type: Boolean,
            default: false
        },
        // Controls the width of the text column on md and larger screens
        textColSize: {
            type: Number,
            default: 6
        }
    }
}
</script>

<style scoped>
.text-col,
.image-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

@media (max-width: 960px) {
    .text-col {
        order: last !important;
    }

    .image-col {
        order: first !important;
    }
}
</style>