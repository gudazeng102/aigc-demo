<template>
  <div class="video-generate">
    <a-card title="视频生成">
      <a-form layout="vertical">
        <a-form-item label="模型选择">
          <a-select v-model:value="form.model" :options="modelOptions" @change="handleModelChange" />
        </a-form-item>

        <a-form-item label="分辨率">
          <a-radio-group v-model:value="form.resolution" option-type="button" :options="resolutionOptions" />
        </a-form-item>

        <a-form-item label="比例">
          <a-radio-group v-model:value="form.ratio" option-type="button" :options="ratioOptions" />
        </a-form-item>

        <a-form-item label="时长">
          <a-slider v-model:value="form.duration" :min="2" :max="12" :step="1" show-markers />
          <div class="duration-value">{{ form.duration }} 秒</div>
        </a-form-item>

        <a-form-item label="参考图（首帧）">
          <a-space direction="vertical" style="width: 100%">
            <a-upload
              :before-upload="(file: any) => beforeUpload(file, 'imageUrl')"
              :show-upload-list="false"
              accept="image/*"
            >
              <a-button><upload-outlined /> 上传参考图</a-button>
            </a-upload>
            <a-input v-model:value="form.imageUrl" placeholder="或输入图片 URL / base64（可选）" />
            <div v-if="form.imageUrl" class="preview-text">已选择参考图</div>
          </a-space>
        </a-form-item>

        <template v-if="isProModel">
          <a-form-item label="尾帧图">
            <a-space direction="vertical" style="width: 100%">
              <a-upload
                :before-upload="(file: any) => beforeUpload(file, 'endImageUrl')"
                :show-upload-list="false"
                accept="image/*"
              >
                <a-button><upload-outlined /> 上传尾帧图</a-button>
              </a-upload>
              <div v-if="form.endImageUrl" class="preview-text">已选择尾帧图</div>
            </a-space>
          </a-form-item>

          <a-form-item label="音频">
            <a-radio-group v-model:value="form.generateAudio" option-type="button">
              <a-radio :value="false">无声</a-radio>
              <a-radio :value="true">有声</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="草稿模式">
            <a-radio-group v-model:value="form.draft" option-type="button">
              <a-radio :value="false">关闭</a-radio>
              <a-radio :value="true">开启</a-radio>
            </a-radio-group>
            <div class="hint">开启草稿模式会自动切换为 480p，生成更快更省钱</div>
          </a-form-item>
        </template>

        <a-form-item label="生成数量">
          <a-input-number :value="1" :disabled="true" style="width: 120px" />
        </a-form-item>

        <a-form-item label="生成指令">
          <a-textarea
            v-model:value="form.prompt"
            :rows="4"
            placeholder="请输入视频生成指令，描述越详细效果越好"
          />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" size="large" @click="handleSubmit">开始生成</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card v-if="completedTasks.length > 0" title="生成结果" class="result-card">
      <a-row :gutter="[16, 16]">
        <a-col
          v-for="task in completedTasks"
          :key="task.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <div class="result-item">
            <img
              v-if="task.type === 'image'"
              :src="task.result_url"
              :alt="task.content"
              style="max-width: 400px; width: 100%"
            />
            <video
              v-else
              :src="task.result_url"
              controls
              style="max-width: 400px; width: 100%"
            />
            <p class="result-content">{{ task.content }}</p>
            <p class="result-meta">
              平台：{{ platformLabel(task.platform) }} | {{ task.created_at }}
            </p>
            <a :href="task.result_url" download target="_blank">
              <a-button type="primary" size="small">下载结果</a-button>
            </a>
          </div>
        </a-col>
      </a-row>
    </a-card>

    <a-card title="任务列表" class="list-card">
      <a-table
        :dataSource="tasks"
        :columns="columns"
        :rowKey="(record: Task) => record.id"
        :pagination="{ pageSize: 10 }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tooltip v-if="record.status === 'failed'" :title="record.error_message || '生成失败'">
              <a-tag :color="statusColor(record.status)">
                {{ statusText(record.status) }}
              </a-tag>
            </a-tooltip>
            <a-tag v-else :color="statusColor(record.status)">
              <loading-outlined v-if="record.status === 'processing'" />
              {{ statusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            {{ typeText(record.type) }}
          </template>
          <template v-else-if="column.key === 'platform'">
            {{ platformLabel(record.platform) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a
                v-if="record.status === 'completed' && record.result_url"
                :href="record.result_url"
                download
                target="_blank"
              >
                <a-button size="small">下载</a-button>
              </a>
              <a-button danger size="small" @click="handleDelete(record.id)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { createTask, getTasks, deleteTask } from '../api/task';

interface Task {
  id: number;
  content: string;
  type: string;
  status: string;
  result_url: string;
  platform: string;
  platform_task_id: string;
  error_message: string;
  created_at: string;
}

const MODEL_FAST = 'doubao-seedance-1-0-pro-fast-251015';
const MODEL_PRO = 'doubao-seedance-1-5-pro-251215';

const defaultParams: Record<string, any> = {
  [MODEL_FAST]: {
    resolution: '720p',
    ratio: '16:9',
    duration: 5,
    imageUrl: '',
    endImageUrl: '',
    generateAudio: false,
    draft: false,
  },
  [MODEL_PRO]: {
    resolution: '720p',
    ratio: 'adaptive',
    duration: 5,
    imageUrl: '',
    endImageUrl: '',
    generateAudio: false,
    draft: false,
  },
};

const form = ref({
  model: MODEL_FAST,
  prompt: '',
  resolution: '720p',
  ratio: '16:9',
  duration: 5,
  imageUrl: '',
  endImageUrl: '',
  generateAudio: false,
  draft: false,
});

const tasks = ref<Task[]>([]);
let pollInterval: ReturnType<typeof setInterval> | null = null;

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

const isProModel = computed(() => form.value.model.includes('1-5-pro'));

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '平台', dataIndex: 'platform', key: 'platform', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '操作', key: 'action', width: 160 }
];

const completedTasks = computed(() =>
  tasks.value.filter((t) => t.status === 'completed' && t.result_url)
);

const fetchTasks = async () => {
  try {
    const response = await getTasks();
    tasks.value = response.data.data || [];
    checkPolling();
  } catch (error) {
    console.error('获取任务列表失败:', error);
    message.error('获取任务列表失败');
  }
};

const startPolling = () => {
  if (pollInterval) return;
  pollInterval = setInterval(() => {
    fetchTasks();
  }, 2000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const checkPolling = () => {
  const hasRunning = tasks.value.some(
    (t) => t.status === 'pending' || t.status === 'processing'
  );
  if (hasRunning) {
    startPolling();
  } else {
    stopPolling();
  }
};

const beforeUpload = (file: File, field: 'imageUrl' | 'endImageUrl') => {
  const reader = new FileReader();
  reader.onload = (e) => {
    form.value[field] = e.target?.result as string;
    message.success('图片已加载');
  };
  reader.readAsDataURL(file);
  return false;
};

const handleModelChange = () => {
  const defaults = JSON.parse(JSON.stringify(defaultParams[form.value.model]));
  form.value.resolution = defaults.resolution;
  form.value.ratio = defaults.ratio;
  form.value.duration = defaults.duration;
  form.value.imageUrl = defaults.imageUrl;
  form.value.endImageUrl = defaults.endImageUrl;
  form.value.generateAudio = defaults.generateAudio;
  form.value.draft = defaults.draft;
};

const handleSubmit = async () => {
  const prompt = form.value.prompt.trim();
  if (!prompt) {
    message.warning('请输入生成指令');
    return;
  }

  const payload: any = {
    content: prompt,
    type: 'video',
    model: form.value.model,
    resolution: form.value.resolution,
    ratio: form.value.ratio,
    duration: form.value.duration,
    imageUrl: form.value.imageUrl,
  };

  if (isProModel.value) {
    payload.endImageUrl = form.value.endImageUrl;
    payload.generateAudio = form.value.generateAudio;
    payload.draft = form.value.draft;
  }

  try {
    await createTask(payload);
    form.value.prompt = '';
    message.success('提交成功');
    await fetchTasks();
    startPolling();
  } catch (error) {
    console.error('提交任务失败:', error);
    message.error('提交失败');
  }
};

const handleDelete = async (id: number) => {
  try {
    await deleteTask(id);
    message.success('删除成功');
    await fetchTasks();
  } catch (error) {
    console.error('删除任务失败:', error);
    message.error('删除失败');
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'orange';
    case 'processing': return 'blue';
    case 'completed': return 'green';
    case 'failed': return 'red';
    default: return 'default';
  }
};

const statusText = (status: string) => {
  switch (status) {
    case 'pending': return '排队中';
    case 'processing': return '生成中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
};

const typeText = (type: string) => {
  return type === 'image' ? '图像' : type === 'video' ? '视频' : type;
};

const platformLabel = (platformName: string) => {
  const map: Record<string, string> = { jimeng: '即梦 (Jimeng)' };
  return map[platformName] || platformName;
};

onMounted(() => {
  fetchTasks();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.video-generate {
  padding: 8px;
}

.result-card,
.list-card {
  margin-top: 24px;
}

.result-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.result-content {
  margin-top: 12px;
  margin-bottom: 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.result-meta {
  margin-top: 4px;
  margin-bottom: 12px;
  color: #888;
  font-size: 12px;
}

.duration-value {
  text-align: right;
  color: #666;
  font-size: 12px;
}

.preview-text {
  color: #52c41a;
  font-size: 12px;
}

.hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
</style>
