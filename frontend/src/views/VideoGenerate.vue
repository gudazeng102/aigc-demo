<template>
  <div class="video-generate">
    <a-result title="视频生成" sub-title="功能开发中...">
      <template #icon>
        <video-camera-outlined />
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { VideoCameraOutlined } from '@ant-design/icons-vue';
</script>

<style scoped>
.video-generate {
  padding: 48px 0;
}
</style>
