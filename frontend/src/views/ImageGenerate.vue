<template>
  <div class="image-generate">
    <a-card title="图像生成">
      <a-space :size="16" wrap align="baseline">
        <a-input
          v-model:value="content"
          placeholder="请输入生成指令"
          style="width: 360px"
          @pressEnter="handleSubmit"
        />
        <a-radio-group v-model:value="taskType">
          <a-radio value="image">图片生成</a-radio>
          <a-radio value="video">视频生成</a-radio>
        </a-radio-group>
        <a-button type="primary" @click="handleSubmit">开始生成</a-button>
      </a-space>
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
            <a-tag :color="statusColor(record.status)">
              {{ statusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            {{ typeText(record.type) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button danger size="small" @click="handleDelete(record.id)">
              删除
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { createTask, getTasks, deleteTask } from '../api/task';

interface Task {
  id: number;
  content: string;
  type: string;
  status: string;
  result_url: string;
  created_at: string;
}

const content = ref('');
const taskType = ref('image');
const tasks = ref<Task[]>([]);

let pollInterval: ReturnType<typeof setInterval> | null = null;

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '操作', key: 'action', width: 120 }
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

const handleSubmit = async () => {
  const value = content.value.trim();
  if (!value) {
    message.warning('请输入生成指令');
    return;
  }

  try {
    await createTask(value, taskType.value);
    content.value = '';
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
    case 'pending':
      return 'orange';
    case 'processing':
      return 'blue';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    default:
      return 'default';
  }
};

const statusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '排队中';
    case 'processing':
      return '生成中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
};

const typeText = (type: string) => {
  return type === 'image' ? '图像' : type === 'video' ? '视频' : type;
};

onMounted(() => {
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
  color: #555;
  font-size: 14px;
}
</style>
