<template>
  <div class="chat-message" :class="{ 'is-user': role === 'user', 'is-assistant': role === 'assistant' }">
    <div class="message-avatar" v-if="role === 'assistant'">
      <a-avatar size="small" style="backgroundColor: #1677ff">AI</a-avatar>
    </div>
    <div class="message-bubble" :class="{ 'is-loading': loading }">
      <div v-if="type === 'text' && !loading" class="message-text">{{ content }}</div>
      <div v-else-if="type === 'image' && resultUrl" class="message-media">
        <a-image :src="resultUrl" style="max-width: 100%; max-height: 300px; border-radius: 8px" />
      </div>
      <div v-else-if="type === 'video' && resultUrl" class="message-media">
        <video :src="resultUrl" controls style="max-width: 100%; max-height: 300px; border-radius: 8px" />
      </div>
      <div v-else-if="loading" class="message-loading">
        <a-spin size="small" />
        <span class="loading-text">内容正在生成中，请稍后...</span>
      </div>
      <div v-else class="message-text">{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  resultUrl?: string;
  loading?: boolean;
}>();
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

.message-text {
  white-space: pre-wrap;
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
</style>