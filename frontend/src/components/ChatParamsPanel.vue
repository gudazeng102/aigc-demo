<template>
  <div class="chat-params-panel" v-if="mode !== 'chat'">
    <a-button type="link" size="small" @click="expanded = !expanded" class="toggle-btn">
      {{ expanded ? '▲ 收起参数设置' : '▼ 参数设置' }}
    </a-button>

    <div v-show="expanded" class="params-body">
      <!-- 图像参数 -->
      <template v-if="mode === 'image'">
        <div class="param-row">
          <span class="param-label">分辨率</span>
          <a-radio-group v-model:value="localParams.resolution" size="small" option-type="button" :options="imageResolutionOptions" />
        </div>
        <div class="param-row">
          <span class="param-label">比例</span>
          <a-radio-group v-model:value="localParams.ratio" size="small" option-type="button" :options="imageRatioOptions" />
        </div>
        <div class="param-row">
          <span class="param-label">参考图</span>
          <a-space>
            <a-upload
              :before-upload="(file: any) => beforeUpload(file, 'imageUrl')"
              :show-upload-list="false"
              accept="image/*"
            >
              <a-button size="small">上传</a-button>
            </a-upload>
            <a-input v-model:value="localParams.imageUrl" placeholder="或输入图片URL" size="small" style="width: 240px" />
          </a-space>
        </div>
        <div class="param-row">
          <span class="param-label">生成数量</span>
          <a-input-number :value="1" :disabled="true" size="small" style="width: 80px" />
        </div>
      </template>

      <!-- 视频参数 -->
      <template v-if="mode === 'video'">
        <div class="param-row">
          <span class="param-label">模型</span>
          <a-select v-model:value="localParams.model" :options="modelOptions" size="small" style="width: 200px" @change="handleModelChange" />
        </div>
        <div class="param-row">
          <span class="param-label">分辨率</span>
          <a-radio-group v-model:value="localParams.resolution" size="small" option-type="button" :options="resolutionOptions" />
        </div>
        <div class="param-row">
          <span class="param-label">比例</span>
          <a-radio-group v-model:value="localParams.ratio" size="small" option-type="button" :options="ratioOptions" />
        </div>
        <div class="param-row">
          <span class="param-label">时长</span>
          <a-slider v-model:value="localParams.duration" :min="2" :max="12" :step="1" style="width: 200px" />
          <span style="margin-left: 8px; font-size: 12px; color: #666;">{{ localParams.duration }}秒</span>
        </div>
        <div class="param-row">
          <span class="param-label">参考图（首帧）</span>
          <a-space>
            <a-upload
              :before-upload="(file: any) => beforeUpload(file, 'imageUrl')"
              :show-upload-list="false"
              accept="image/*"
            >
              <a-button size="small">上传</a-button>
            </a-upload>
            <a-input v-model:value="localParams.imageUrl" placeholder="或输入图片 URL" size="small" style="width: 240px" />
          </a-space>
        </div>
        <template v-if="isProModel">
          <div class="param-row">
            <span class="param-label">尾帧图</span>
            <a-space>
              <a-upload
                :before-upload="(file: any) => beforeUpload(file, 'endImageUrl')"
                :show-upload-list="false"
                accept="image/*"
              >
                <a-button size="small">上传</a-button>
              </a-upload>
            </a-space>
          </div>
          <div class="param-row">
            <span class="param-label">音频</span>
            <a-radio-group v-model:value="localParams.generateAudio" size="small" option-type="button">
              <a-radio :value="false">无声</a-radio>
              <a-radio :value="true">有声</a-radio>
            </a-radio-group>
          </div>
          <div class="param-row">
            <span class="param-label">草稿模式</span>
            <a-radio-group v-model:value="localParams.draft" size="small" option-type="button">
              <a-radio :value="false">关闭</a-radio>
              <a-radio :value="true">开启</a-radio>
            </a-radio-group>
            <span class="hint">草稿模式自动切换480p</span>
          </div>
        </template>
        <div class="param-row">
          <span class="param-label">生成数量</span>
          <a-input-number :value="1" :disabled="true" size="small" style="width: 80px" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { message } from 'ant-design-vue';

const MODEL_FAST = 'doubao-seedance-1-0-pro-fast-251015';
const MODEL_PRO = 'doubao-seedance-1-5-pro-251215';

const props = defineProps<{
  mode: string;
  params: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:params', params: Record<string, any>): void;
}>();

const expanded = ref(false);

const defaultImageParams: Record<string, any> = {
  resolution: '1K',
  ratio: '1:1',
  imageUrl: '',
};

const defaultVideoParams: Record<string, any> = {
  model: MODEL_PRO,
  resolution: '720p',
  ratio: '16:9',
  duration: 5,
  imageUrl: '',
  endImageUrl: '',
  generateAudio: false,
  draft: false,
};

const localParams = ref<Record<string, any>>({ ...props.params });

watch(() => props.mode, () => {
  if (props.mode === 'image') {
    localParams.value = { ...defaultImageParams, ...props.params };
  } else if (props.mode === 'video') {
    localParams.value = { ...defaultVideoParams, ...props.params };
  }
  expanded.value = false;
});

watch(localParams, (val) => {
  emit('update:params', { ...val });
}, { deep: true });

const imageResolutionOptions = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

const imageRatioOptions = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '9:16', value: '9:16' },
];

const modelOptions = [
  { label: '即梦 1.0 Pro Fast', value: MODEL_FAST },
  { label: '即梦 1.5 Pro', value: MODEL_PRO },
];

const resolutionOptions = [
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
];

const ratioOptions = [
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '9:16', value: '9:16' },
  { label: '21:9', value: '21:9' },
  { label: 'adaptive', value: 'adaptive' },
];

const isProModel = computed(() => localParams.value.model?.includes('1-5-pro'));

const handleModelChange = () => {
  if (isProModel.value) {
    localParams.value.ratio = 'adaptive';
  } else {
    localParams.value.ratio = '16:9';
    localParams.value.endImageUrl = '';
    localParams.value.generateAudio = false;
    localParams.value.draft = false;
  }
};

const beforeUpload = (file: File, field: string) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    localParams.value[field] = e.target?.result as string;
    message.success('图片已加载');
  };
  reader.readAsDataURL(file);
  return false;
};
</script>

<style scoped>
.chat-params-panel {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.toggle-btn {
  padding: 4px 0;
}

.params-body {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.param-label {
  min-width: 80px;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.hint {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}
</style>