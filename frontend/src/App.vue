<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider collapsible>
      <div class="logo">AIGC Demo</div>
      <a-menu
        theme="dark"
        mode="inline"
        :selectedKeys="selectedKeys"
      >
        <a-menu-item key="/image" @click="$router.push('/image')">
          <span>图像生成</span>
        </a-menu-item>
        <a-menu-item key="/video" @click="$router.push('/video')">
          <span>视频生成</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="header">
        <h3>AIGC 内容生成平台</h3>
      </a-layout-header>

      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const selectedKeys = computed(() => [route.path]);
</script>

<style scoped>
.logo {
  height: 32px;
  margin: 16px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  line-height: 32px;
}

.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header h3 {
  margin: 0;
}

.content {
  margin: 24px;
  background: #fff;
  padding: 24px;
  min-height: 280px;
}
</style>
