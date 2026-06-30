<template>
  <div class="chat-message" :class="{ 'is-user': role === 'user', 'is-assistant': role === 'assistant', 'is-error': isError }">
    <div class="message-avatar" v-if="role === 'assistant'">
      <a-avatar size="small" style="backgroundColor: #1677ff">AI</a-avatar>
    </div>
    <div class="message-bubble" :class="{ 'is-loading': loading, 'is-error': isError }">
      <!-- 文本内容 -->
      <div v-if="type === 'text' && !loading" class="message-text">
        <close-circle-outlined v-if="isError" class="error-icon" />
        {{ content }}
      </div>

      <!-- 图片内容 -->
      <div v-else-if="type === 'image' && resultUrl" class="message-media">
        <a-image :src="resultUrl" style="max-width: 100%; max-height: 300px; border-radius: 8px" />
      </div>

      <!-- 视频内容 -->
      <div v-else-if="type === 'video' && resultUrl" class="message-media">
        <video :src="resultUrl" controls style="max-width: 100%; max-height: 300px; border-radius: 8px" />
      </div>

      <!-- loading 状态 -->
      <div v-else-if="loading" class="message-loading">
        <a-spin size="small" />
        <span class="loading-text">内容正在生成中，请稍后...</span>
      </div>

      <!-- 兜底 -->
      <div v-else class="message-text">{{ content }}</div>

      <!-- 参数卡片（仅生成结果展示） -->
      <div v-if="(type === 'image' || type === 'video') && parsedParams" class="params-card">
        <div class="params-text">{{ formatParamsCard() }}</div>
        <a-button size="small" @click="handleReuseParams">
          📋 复用参数
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CloseCircleOutlined } from '@ant-design/icons-vue';

const props = defineProps<{
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  resultUrl?: string;
  params?: string; // JSON 字符串
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'reuse-params', params: Record<string, any>): void;
}>();

const isError = computed(() => {
  return props.role === 'assistant' && props.type === 'text' && !props.loading && props.content.includes('失败');
});

const parsedParams = computed(() => {
  if (!props.params) return null;
  try {
    return JSON.parse(props.params);
  } catch {
    return null;
  }
});

function formatParamsCard(): string {
  if (!parsedParams.value) return '';
  const p = parsedParams.value;
  if (props.type === 'image') {
    return `图像 · ${p.resolution || '1K'} · ${p.ratio || '1:1'}`;
  }
  if (props.type === 'video') {
    const modelName = p.model?.includes('fast') ? 'Fast' : 'Pro';
    const hasAudio = p.generateAudio ? ' · 有声' : '';
    return `视频 · ${p.resolution || '720p'} · ${p.ratio || '16:9'} · ${p.duration || 5}秒 · ${modelName}${hasAudio}`;
  }
  return '';
}

function handleReuseParams() {
  if (parsedParams.value) {
    emit('reuse-params', parsedParams.value);
  }
}
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 16px;
  gap: 8px;
}

.chat-message.is-user {
  justify-content: flex-end;
}

.chat-message.is-assistant {
  justify-content: flex-start;
}

.message-avatar {
  flex-shrink: 0;
  margin-top: 4px;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
}

.is-user .message-bubble {
  background-color: #e6f7ff;
  border-bottom-right-radius: 4px;
}

.is-assistant .message-bubble {
  background-color: #fff;
  border: 1px solid #f0f0f0;
  border-bottom-left-radius: 4px;
}

.is-assistant .message-bubble.is-error {
  background-color: #fff1f0;
  border-color: #ffccc7;
}

.message-text {
  white-space: pre-wrap;
}

.error-icon {
  color: #ff4d4f;
  margin-right: 6px;
}

.message-media {
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
}

.loading-text {
  font-size: 13px;
  color: #999;
}

/* 参数卡片 */
.params-card {
  margin-top: 10px;
  padding: 8px 10px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.params-text {
  font-size: 12px;
  color: #666;
  flex: 1;
}
</style>