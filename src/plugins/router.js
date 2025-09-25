// plugins/router.js
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Demo from '@/views/Demo.vue'
import MyoSuiteDemo from '@/views/MyoSuiteDemo.vue'

const routes = [
    {
        path: '/',
        name: 'Demo',
        component: Demo,
    },
    {
        path: '/myosuite',
        name: 'MyoSuite',
        component: MyoSuiteDemo
    },
]

const router = createRouter({
    history: createWebHashHistory('/'),
    routes,
})

// add a contemporary fix for memory leak problem
router.beforeEach((to, from, next) => {
    if (from.name && to.fullPath !== from.fullPath) {
        window.location.hash = '#' + to.fullPath
        window.location.reload()
    } else {
        next();
    }
});

export default router 