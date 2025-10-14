// plugins/router.js
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Demo from '@/views/Demo.vue'

const routes = [
    {
        path: '/',
        name: 'Demo',
        component: Demo,
        props: () => ({ configPath: './config.json' })
    },
    // {
    //     path: '/mujoco_menagerie',
    //     name: 'MujocoMenagerie',
    //     component: Demo,
    //     props: () => ({ configPath: './config_mujoco_menagerie.json' })
    // },
    {
        path: '/myosuite',
        name: 'MyoSuite',
        component: Demo,
        props: () => ({ configPath: './config_myosuite.json' })
    },
]

const router = createRouter({
    history: createWebHashHistory('/'),
    routes,
})

export default router 