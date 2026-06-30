<template>
  <div class="template-library">
    <h3>📚 模板库</h3>

    <h4 class="section-title">🖼️ 图像模板</h4>
    <a-row :gutter="[16, 16]" class="template-grid">
      <a-col v-for="tpl in imageTemplates" :key="tpl.id" :xs="24" :sm="12" :md="8" :lg="6">
        <a-card size="small" class="template-card">
          <template #title>
            <span>🖼️ {{ tpl.name }}</span>
          </template>
          <p class="template-desc">{{ tpl.description }}</p>
          <p class="template-params">{{ formatParams('image', tpl.params) }}</p>
          <template #actions>
            <a-button type="primary" size="small" @click="applyTemplate(tpl, 'image')">应用</a-button>
          </template>
        </a-card>
      </a-col>
    </a-row>

    <h4 class="section-title">🎬 视频模板</h4>
    <a-row :gutter="[16, 16]" class="template-grid">
      <a-col v-for="tpl in videoTemplates" :key="tpl.id" :xs="24" :sm="12" :md="8" :lg="6">
        <a-card size="small" class="template-card">
          <template #title>
            <span>🎬 {{ tpl.name }}</span>
          </template>
          <p class="template-desc">{{ tpl.description }}</p>
          <p class="template-params">{{ formatParams('video', tpl.params) }}</p>
          <template #actions>
            <a-button type="primary" size="small" @click="applyTemplate(tpl, 'video')">应用</a-button>
          </template>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { SYSTEM_TEMPLATES, type TemplateItem } from '../constants/templates';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const imageTemplates = SYSTEM_TEMPLATES.image;
const videoTemplates = SYSTEM_TEMPLATES.video;

function formatParams(mode: string, params: Record<string, any>): string {
  if (mode === 'image') {
    return `${params.resolution || '1K'} · ${params.ratio || '1:1'}`;
  }
  const modelName = params.model?.includes('fast') ? 'Fast' : 'Pro';
  return `${params.resolution || '720p'} · ${params.ratio || '16:9'} · ${params.duration || 5}秒 · ${modelName}`;
}

function applyTemplate(tpl: TemplateItem, mode: string) {
  // 将模板数据存入 sessionStorage，让 ChatView 读取（总是新建对话）
  sessionStorage.setItem('applyTemplate', JSON.stringify({
    prompt: tpl.prompt,
    params: { ...tpl.params },
    mode,
    forceNew: true,
  }));
  message.success(`已应用模板「${tpl.name}」，跳转对话界面`);
  router.push('/chat');
}
</script>

<style scoped>
.template-library {
  padding: 8px;
}

.section-title {
  margin-top: 24px;
  margin-bottom: 16px;
  color: #333;
}

.template-grid {
  margin-bottom: 8px;
}

.template-card {
  border: 1px solid #f0f0f0;
}

.template-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  min-height: 36px;
}

.template-params {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}
</style>