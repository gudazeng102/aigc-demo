<template>
  <div class="chat-toolbar">
    <div class="toolbar-left">
      <!-- 插入图片 -->
      <a-upload
        :before-upload="handleUploadImage"
        :show-upload-list="false"
        accept="image/*"
        :disabled="mode === 'chat'"
      >
        <a-button
          size="small"
          :disabled="mode === 'chat'"
          :title="mode === 'chat' ? '普通对话不支持图片上传' : '插入参考图片'"
        >
          📎 插入图片
        </a-button>
      </a-upload>
    </div>
    <div class="toolbar-right">
      <span class="model-label">模型: DeepSeek</span>
      <a-button size="small" @click="handleSwitchMode('image')">🖼️ 图像生成</a-button>
      <a-button size="small" @click="handleSwitchMode('video')">🎬 视频生成</a-button>
    </div>

    <!-- 模式切换确认弹窗 -->
    <a-modal
      v-model:open="switchModalVisible"
      title="切换模式"
      @ok="confirmSwitchMode"
      @cancel="switchModalVisible = false"
    >
      <p>{{ switchModalContent }}</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createSession } from '../api/chat';

const props = defineProps<{
  mode: string;
  currentSessionId: number | null;
}>();

const emit = defineEmits<{
  (e: 'mode-changed', sessionId: number, mode: string): void;
  (e: 'image-uploaded', base64: string): void;
}>();

const switchModalVisible = ref(false);
const switchTargetMode = ref<'image' | 'video'>('image');
const switchModalContent = ref('');

const handleUploadImage = (file: File) => {
  if (props.mode === 'chat') return false;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    emit('image-uploaded', base64);
  };
  reader.readAsDataURL(file);
  return false;
};

const handleSwitchMode = (targetMode: 'image' | 'video') => {
  switchTargetMode.value = targetMode;
  const label = targetMode === 'image' ? '图像生成' : '视频生成';
  switchModalContent.value = `是否切换到${label}模式？这将创建一个新的${label}对话。`;
  switchModalVisible.value = true;
};

const confirmSwitchMode = async () => {
  try {
    const response = await createSession(switchTargetMode.value);
    const newSession = response.data;
    emit('mode-changed', newSession.id, switchTargetMode.value);
  } catch (error) {
    console.error('创建会话失败:', error);
  }
  switchModalVisible.value = false;
};
</script>

<style scoped>
.chat-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-label {
  font-size: 12px;
  color: #888;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>