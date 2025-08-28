<template>
    <div class="video-container">
      <video
        ref="videoEl"
        v-bind="$attrs"
        @waiting="isLoading = true"
        @loadeddata="isLoading = false"
        @canplay="isLoading = false"
        @playing="isLoading = false"
      >
        <slot />
      </video>
      <div v-if="isLoading && showLoading" class="loading-overlay">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </div>
  </template>
  
  <style scoped>
  .video-container {
    position: relative;
    display: block;    /* 避免 inline-block 空隙 */
    width: 100%;
    height: 100%;
    overflow: hidden;  /* 避免 overlay 溢出 */
  }
  
  .video-container video {
    display: block;             /* 避免底部空隙 */
    width: 100%;
    height: 100%;
    margin: 0;
    border: none;
    background: #000;           /* 纯黑背景，遮掉默认色 */
    box-sizing: border-box;     /* 确保宽高准确 */
  }
  
  .loading-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;           /* 不要半透明色，纯指示器更安全 */
    z-index: 10;
    pointer-events: none;       /* 不阻塞鼠标事件 */
  }
  </style>
  

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  showLoading: {
    type: Boolean,
    default: true
  }
})

const videoEl = ref(null)
let observer = null
let showLoading = ref(props.showLoading)
let isLoading = ref(true)

onMounted(() => {
    observer = new IntersectionObserver(
        ([entry]) => {
            if (!videoEl.value) return
            if (entry.isIntersecting) {
                videoEl.value.play().catch(() => { })
            } else {
                videoEl.value.pause()
            }
        },
        { threshold: 0.1 }
    )
    if (videoEl.value) {
        observer.observe(videoEl.value)
        videoEl.value.pause()
    }
})

onBeforeUnmount(() => {
    if (observer && videoEl.value) {
        observer.unobserve(videoEl.value)
        observer.disconnect()
    }
})
</script>
