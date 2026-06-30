<template>
  <div class="chat-template-panel" v-if="visible">
    <a-tabs v-model:activeKey="activeTab" size="small">
      <a-tab-pane key="templates" tab="系统模板">
        <div class="panel-section">
          <div class="panel-subtitle">🖼️ 图像模板</div>
          <div class="template-tags">
            <a-tag
              v-for="tpl in imageTemplates"
              :key="tpl.id"
              color="blue"
              class="template-tag"
              @click="applyTemplate(tpl, 'image')"
            >
              🖼️ {{ tpl.name }}
            </a-tag>
          </div>
        </div>
        <div class="panel-section">
          <div class="panel-subtitle">🎬 视频模板</div>
          <div class="template-tags">
            <a-tag
              v-for="tpl in videoTemplates"
              :key="tpl.id"
              color="green"
              class="template-tag"
              @click="applyTemplate(tpl, 'video')"
            >
              🎬 {{ tpl.name }}
            </a-tag>
          </div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="presets" tab="我的预设">
        <div v-if="presets.length === 0" class="empty-text">暂无预设</div>
        <div v-else class="preset-list">
          <div v-for="item in presets" :key="item.id" class="preset-item" @click="applyPresetItem(item)">
            <span class="preset-name">📌 {{ item.name }}</span>
            <span class="preset-summary">{{ formatPresetSummary(item.mode, item.params) }}</span>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { SYSTEM_TEMPLATES, type TemplateItem } from '../constants/templates';
import { getPresets } from '../api/preset';

interface PresetItem {
  id: number;
  name: string;
  mode: string;
  prompt: string;
  params: string;
}

const props = defineProps<{
  visible: boolean;
  currentMode: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', data: { prompt: string; params: Record<string, any>; mode: string }): void;
}>();

const activeTab = ref('templates');
const imageTemplates = SYSTEM_TEMPLATES.image;
const videoTemplates = SYSTEM_TEMPLATES.video;
const presets = ref<PresetItem[]>([]);

// 每次展开时重新获取预设列表
watch(() => props.visible, async (val) => {
  if (val) {
    activeTab.value = 'templates';
    try {
      const response = await getPresets();
      presets.value = response.data || [];
    } catch (error) {
      console.error('获取预设失败:', error);
    }
  }
});

function formatPresetSummary(mode: string, paramsStr: string): string {
  try {
    const p = JSON.parse(paramsStr);
    if (mode === 'image') {
      return `${p.resolution || '1K'} · ${p.ratio || '1:1'}`;
    }
    if (mode === 'video') {
      const modelName = p.model?.includes('fast') ? 'Fast' : 'Pro';
      return `${p.resolution || '720p'} · ${p.ratio || '16:9'} · ${p.duration || 5}秒 · ${modelName}`;
    }
    return '';
  } catch {
    return '';
  }
}

function applyTemplate(tpl: TemplateItem, mode: string) {
  emit('apply', {
    prompt: tpl.prompt,
    params: { ...tpl.params },
    mode,
  });
}

function applyPresetItem(item: PresetItem) {
  let params: Record<string, any> = {};
  try {
    params = JSON.parse(item.params);
  } catch {
    params = {};
  }
  emit('apply', {
    prompt: item.prompt || '',
    params,
    mode: item.mode,
  });
}
</script>

<style scoped>
.chat-template-panel {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
  background: #fafafa;
}

.panel-section {
  margin-bottom: 12px;
}

.panel-subtitle {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  opacity: 0.8;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.preset-item:hover {
  background: #e6f7ff;
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.preset-summary {
  font-size: 11px;
  color: #999;
}

.empty-text {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 16px;
}
</style>