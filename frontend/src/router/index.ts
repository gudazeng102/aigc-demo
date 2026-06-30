import { createRouter, createWebHistory } from 'vue-router';
import ImageGenerate from '../views/ImageGenerate.vue';
import VideoGenerate from '../views/VideoGenerate.vue';
import ChatView from '../views/ChatView.vue';
import TemplateLibrary from '../views/TemplateLibrary.vue';
import MyPresets from '../views/MyPresets.vue';

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/image', component: ImageGenerate },
  { path: '/video', component: VideoGenerate },
  { path: '/chat', component: ChatView },
  { path: '/template-library', component: TemplateLibrary },
  { path: '/my-presets', component: MyPresets }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
