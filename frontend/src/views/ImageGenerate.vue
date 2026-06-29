<template>
  <div class="image-generate">
    <a-card title="图像生成">
      <a-form layout="vertical">
        <a-form-item label="分辨率">
          <a-radio-group v-model:value="form.resolution" option-type="button" :options="resolutionOptions" />
        </a-form-item>

        <a-form-item label="参考图">
          <a-space direction="vertical" style="width: 100%">
            <a-space>
              <a-upload
                :before-upload="(file: any) => beforeUpload(file)"
                :show-upload-list="false"
                accept="image/*"
              >
                <a-button><upload-outlined /> 上传参考图</a-button>
              </a-upload>
              <a-button @click="useSampleImage">使用示例图</a-button>
            </a-space>
            <a-input v-model:value="form.imageUrl" placeholder="或输入图片 URL / base64（可选）" />
            <div v-if="form.imageUrl" class="preview-text">已选择参考图</div>
          </a-space>
        </a-form-item>

        <a-form-item label="生成数量">
          <a-input-number :value="1" :disabled="true" style="width: 120px" />
        </a-form-item>

        <a-form-item label="生成指令">
          <a-textarea
            v-model:value="form.prompt"
            :rows="4"
            placeholder="请输入图像生成指令，描述越详细效果越好"
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

const form = ref({
  resolution: '1K',
  prompt: '',
  imageUrl: '',
});

const sampleImageBase64 = ref('');
const tasks = ref<Task[]>([]);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const resolutionOptions = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

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

const beforeUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.imageUrl = e.target?.result as string;
    message.success('图片已加载');
  };
  reader.readAsDataURL(file);
  return false;
};

const useSampleImage = () => {
  if (sampleImageBase64.value) {
    form.value.imageUrl = sampleImageBase64.value;
    message.success('已填入示例图');
  } else {
    message.warning('示例图尚未加载完成，请稍后再试');
  }
};

const loadSampleImage = async () => {
  try {
    const response = await fetch('/tu/manbuzhe.jpg');
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onload = (e) => {
      sampleImageBase64.value = e.target?.result as string;
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error('加载示例图失败:', error);
  }
};

const handleSubmit = async () => {
  const prompt = form.value.prompt.trim();
  if (!prompt) {
    message.warning('请输入生成指令');
    return;
  }

  const payload: any = {
    content: prompt,
    type: 'image',
    resolution: form.value.resolution,
  };

  if (form.value.imageUrl) {
    payload.imageUrl = form.value.imageUrl;
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
  loadSampleImage();
  fetchTasks();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.image-generate {
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

.preview-text {
  color: #52c41a;
  font-size: 12px;
}
</style>
