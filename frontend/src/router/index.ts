import { createRouter, createWebHistory } from 'vue-router';
import ImageGenerate from '../views/ImageGenerate.vue';
import VideoGenerate from '../views/VideoGenerate.vue';

const routes = [
  { path: '/', redirect: '/image' },
  { path: '/image', component: ImageGenerate },
  { path: '/video', component: VideoGenerate }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
