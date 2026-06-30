<template>
  <div class="my-presets">
    <div class="page-header">
      <h3>📌 我的预设</h3>
      <a-button type="primary" @click="showCreateModal">+ 新建预设</a-button>
    </div>

    <!-- 空状态 -->
    <a-empty v-if="presets.length === 0" description="暂无预设，去对话界面保存一个吧！">
    </a-empty>

    <!-- 预设列表 -->
    <a-list v-else :data-source="presets" :loading="loading">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <span>📌 {{ item.name }}</span>
            </template>
            <template #description>
              <span class="preset-summary">{{ formatPresetSummary(item.mode, item.params) }}</span>
              <span v-if="item.description" class="preset-desc">{{ item.description }}</span>
            </template>
          </a-list-item-meta>
          <template #actions>
            <a-button size="small" type="primary" @click="applyPreset(item)">应用</a-button>
            <a-button size="small" @click="showEditModal(item)">编辑</a-button>
            <a-popconfirm title="确定删除此预设？" @confirm="handleDelete(item.id)" ok-text="删除" ok-danger>
              <a-button size="small" danger>删除</a-button>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- 新建/编辑模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEditing ? '编辑预设' : '新建预设'"
      @ok="handleSave"
      @cancel="modalVisible = false"
      ok-text="保存"
    >
      <a-form layout="vertical">
        <a-form-item label="名称" required>
          <a-input v-model:value="form.name" placeholder="请输入预设名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="可选描述" />
        </a-form-item>
        <!-- 编辑时：只读展示预设内容详情 -->
        <template v-if="isEditing">
          <a-form-item label="模式">
            <a-input :value="form.mode === 'image' ? '图像' : '视频'" disabled />
          </a-form-item>
          <a-form-item label="提示词">
            <a-textarea :value="form.prompt" :rows="2" disabled />
          </a-form-item>
          <a-form-item label="参数">
            <a-input :value="formattedParams" disabled />
          </a-form-item>
        </template>
        <!-- 新建时：显示模式和参数编辑 -->
        <template v-if="!isEditing">
          <a-form-item label="模式" required>
            <a-select v-model:value="form.mode" :options="modeOptions" style="width: 120px" />
          </a-form-item>
          <a-form-item label="提示词">
            <a-textarea v-model:value="form.prompt" :rows="3" placeholder="生成提示词" />
          </a-form-item>
          <template v-if="form.mode === 'image'">
            <a-form-item label="分辨率">
              <a-radio-group v-model:value="form.params.resolution" option-type="button" size="small" :options="[
                { label: '1K', value: '1K' },
                { label: '2K', value: '2K' },
                { label: '4K', value: '4K' },
              ]" />
            </a-form-item>
            <a-form-item label="比例">
              <a-radio-group v-model:value="form.params.ratio" option-type="button" size="small" :options="[
                { label: '1:1', value: '1:1' },
                { label: '16:9', value: '16:9' },
                { label: '4:3', value: '4:3' },
                { label: '3:4', value: '3:4' },
                { label: '9:16', value: '9:16' },
              ]" />
            </a-form-item>
          </template>
          <template v-if="form.mode === 'video'">
            <a-form-item label="模型">
              <a-select v-model:value="form.params.model" style="width: 200px" :options="[
                { label: '即梦 1.0 Pro Fast', value: 'doubao-seedance-1-0-pro-fast-251015' },
                { label: '即梦 1.5 Pro', value: 'doubao-seedance-1-5-pro-251215' },
              ]" />
            </a-form-item>
            <a-form-item label="分辨率">
              <a-radio-group v-model:value="form.params.resolution" option-type="button" size="small" :options="[
                { label: '480p', value: '480p' },
                { label: '720p', value: '720p' },
                { label: '1080p', value: '1080p' },
              ]" />
            </a-form-item>
            <a-form-item label="比例">
              <a-radio-group v-model:value="form.params.ratio" option-type="button" size="small" :options="[
                { label: '16:9', value: '16:9' },
                { label: '4:3', value: '4:3' },
                { label: '1:1', value: '1:1' },
                { label: '3:4', value: '3:4' },
                { label: '9:16', value: '9:16' },
                { label: '21:9', value: '21:9' },
                { label: 'adaptive', value: 'adaptive' },
              ]" />
            </a-form-item>
            <a-form-item label="时长">
              <a-slider v-model:value="form.params.duration" :min="2" :max="12" :step="1" style="width: 200px" />
              <span style="margin-left: 8px; font-size: 12px; color: #666;">{{ form.params.duration }}秒</span>
            </a-form-item>
            <a-form-item label="音频">
              <a-radio-group v-model:value="form.params.generateAudio" option-type="button" size="small">
                <a-radio :value="false">无声</a-radio>
                <a-radio :value="true">有声</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="草稿模式">
              <a-radio-group v-model:value="form.params.draft" option-type="button" size="small">
                <a-radio :value="false">关闭</a-radio>
                <a-radio :value="true">开启</a-radio>
              </a-radio-group>
            </a-form-item>
          </template>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { getPresets, createPreset, updatePreset, deletePreset } from '../api/preset';

interface PresetItem {
  id: number;
  name: string;
  description: string;
  mode: string;
  prompt: string;
  params: string;
  created_at: string;
}

const router = useRouter();
const presets = ref<PresetItem[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const isEditing = ref(false);
const editId = ref<number | null>(null);

const defaultForm = {
  name: '',
  description: '',
  mode: 'image' as string,
  prompt: '',
  params: {
    resolution: '1K',
    ratio: '1:1',
    model: 'doubao-seedance-1-5-pro-251215',
    duration: 5,
    generateAudio: false,
    draft: false,
  },
};

const form = ref({ ...defaultForm, params: { ...defaultForm.params } });

const formattedParams = computed(() => {
  const p = form.value.params;
  if (form.value.mode === 'image') {
    return `分辨率: ${p.resolution || '1K'}, 比例: ${p.ratio || '1:1'}`;
  }
  const modelName = p.model?.includes('fast') ? 'Fast' : 'Pro';
  return `模型: ${modelName}, 分辨率: ${p.resolution || '720p'}, 比例: ${p.ratio || '16:9'}, 时长: ${p.duration || 5}秒`;
});

const modeOptions = [
  { label: '图像', value: 'image' },
  { label: '视频', value: 'video' },
];

function formatPresetSummary(mode: string, paramsStr: string): string {
  try {
    const p = JSON.parse(paramsStr);
    if (mode === 'image') {
      return `图像 · ${p.resolution || '1K'} · ${p.ratio || '1:1'}`;
    }
    if (mode === 'video') {
      const modelName = p.model?.includes('fast') ? 'Fast' : 'Pro';
      return `视频 · ${p.resolution || '720p'} · ${p.ratio || '16:9'} · ${p.duration || 5}秒 · ${modelName}`;
    }
    return '';
  } catch {
    return '';
  }
}

const fetchPresets = async () => {
  loading.value = true;
  try {
    const response = await getPresets();
    presets.value = response.data || [];
  } catch (error) {
    console.error('获取预设列表失败:', error);
    message.error('获取预设列表失败');
  } finally {
    loading.value = false;
  }
};

function showCreateModal() {
  isEditing.value = false;
  editId.value = null;
  form.value = {
    name: '',
    description: '',
    mode: 'image',
    prompt: '',
    params: { ...defaultForm.params },
  };
  modalVisible.value = true;
}

function showEditModal(item: PresetItem) {
  isEditing.value = true;
  editId.value = item.id;
  form.value = {
    name: item.name,
    description: item.description,
    mode: item.mode,
    prompt: item.prompt,
    params: { ...defaultForm.params },
  };
  modalVisible.value = true;
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    message.warning('请输入预设名称');
    return;
  }

  try {
    if (isEditing.value && editId.value !== null) {
      await updatePreset(editId.value, {
        name: form.value.name,
        description: form.value.description,
      });
      message.success('预设已更新');
    } else {
      await createPreset({
        name: form.value.name,
        description: form.value.description,
        mode: form.value.mode,
        prompt: form.value.prompt,
        params: form.value.params,
      });
      message.success('预设保存成功');
    }
    modalVisible.value = false;
    await fetchPresets();
  } catch (error) {
    console.error('保存预设失败:', error);
    message.error('保存失败');
  }
};

const handleDelete = async (id: number) => {
  try {
    await deletePreset(id);
    message.success('删除成功');
    await fetchPresets();
  } catch (error) {
    console.error('删除预设失败:', error);
    message.error('删除失败');
  }
};

function applyPreset(item: PresetItem) {
  let params: Record<string, any> = {};
  try {
    params = JSON.parse(item.params);
  } catch {
    params = {};
  }
  sessionStorage.setItem('applyTemplate', JSON.stringify({
    prompt: item.prompt || '',
    params,
    mode: item.mode,
    forceNew: true,
  }));
  message.success(`已应用预设「${item.name}」，跳转对话界面`);
  router.push('/chat');
}

onMounted(() => {
  fetchPresets();
});
</script>

<style scoped>
.my-presets {
  padding: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.preset-summary {
  font-size: 12px;
  color: #666;
  margin-right: 12px;
}

.preset-desc {
  font-size: 12px;
  color: #999;
}
</style>