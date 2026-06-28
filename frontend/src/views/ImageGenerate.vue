<template>
  <div class="image-generate">
    <a-card title="图像生成">
      <a-space :size="16" wrap>
        <a-input
          v-model:value="content"
          placeholder="请输入生成指令"
          style="width: 360px"
          @pressEnter="handleSubmit"
        />
        <a-button type="primary" @click="handleSubmit">提交</a-button>
      </a-space>
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
import { ref, onMounted } from 'vue';
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
const tasks = ref<Task[]>([]);

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '操作', key: 'action', width: 120 }
];

const fetchTasks = async () => {
  try {
    const response = await getTasks();
    tasks.value = response.data.data || [];
  } catch (error) {
    console.error('获取任务列表失败:', error);
    message.error('获取任务列表失败');
  }
};

const handleSubmit = async () => {
  const value = content.value.trim();
  if (!value) {
    message.warning('请输入生成指令');
    return;
  }

  try {
    await createTask(value, 'image');
    content.value = '';
    message.success('提交成功');
    await fetchTasks();
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
    case 'completed':
      return 'success';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'error';
    case 'pending':
    default:
      return 'default';
  }
};

const statusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '待处理';
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
</script>

<style scoped>
.image-generate {
  padding: 8px;
}

.list-card {
  margin-top: 24px;
}
</style>
