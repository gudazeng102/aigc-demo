<template>
  <div class="chat-view">
    <!-- 左栏：对话列表 -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <a-button type="primary" size="small" block @click="handleNewChat">+ 新建</a-button>
      </div>
      <div class="sidebar-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="sidebar-item"
          :class="{ 'is-active': currentSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <div class="item-title">{{ session.title || getDefaultTitle(session) }}</div>
          <div class="item-meta">{{ session.mode === 'chat' ? '普通对话' : session.mode === 'image' ? '图像生成' : '视频生成' }}</div>
          <a-button
            size="small"
            type="text"
            danger
            class="delete-btn"
            @click.stop="showDeleteConfirm(session.id)"
          >
            ×
          </a-button>
        </div>
      </div>
    </div>

    <!-- 右栏：聊天区域 -->
    <div class="chat-main">
      <template v-if="currentSessionId">
        <!-- 消息气泡区 -->
        <div class="message-area" ref="messageAreaRef">
          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :role="msg.role"
            :content="msg.content"
            :type="msg.type"
            :result-url="msg.result_url"
          />
          <!-- loading 气泡 -->
          <ChatMessage
            v-if="isGenerating"
            role="assistant"
            content="内容正在生成中，请稍后..."
            :loading="true"
          />
        </div>

        <!-- 工具栏 -->
        <ChatToolbar
          :mode="currentMode"
          :current-session-id="currentSessionId"
          @mode-changed="handleModeChanged"
          @image-uploaded="handleImageUploaded"
        />

        <!-- 参数面板 -->
        <ChatParamsPanel
          :mode="currentMode"
          :params="currentParams"
          @update:params="handleParamsUpdate"
        />

        <!-- 输入框 + 发送 -->
        <div class="input-area">
          <a-textarea
            v-model:value="inputMessage"
            :rows="3"
            placeholder="请输入内容..."
            @keydown="handleKeydown"
            :disabled="isGenerating"
          />
          <a-button
            type="primary"
            shape="circle"
            class="send-btn"
            @click="handleSend"
            :loading="isGenerating"
            :disabled="!inputMessage.trim() || isGenerating"
          >
            <template #icon><SendOutlined /></template>
          </a-button>
        </div>
      </template>

      <!-- 无选中会话 -->
      <div v-else class="empty-state">
        <a-empty description="请选择或新建一个对话">
          <a-button type="primary" @click="handleNewChat">新建对话</a-button>
        </a-empty>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="deleteModalVisible"
      title="删除对话"
      @ok="confirmDelete"
      @cancel="deleteModalVisible = false"
      ok-text="删除"
      ok-danger
    >
      <p>是否删除当前对话？删除后不可恢复。</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { message } from 'ant-design-vue';
import { SendOutlined } from '@ant-design/icons-vue';
import ChatMessage from '../components/ChatMessage.vue';
import ChatToolbar from '../components/ChatToolbar.vue';
import ChatParamsPanel from '../components/ChatParamsPanel.vue';
import { createSession, getSessions, deleteSession, getMessages, sendMessage } from '../api/chat';

const sessions = ref<any[]>([]);
const currentSessionId = ref<number | null>(null);
const currentMode = ref<string>('chat');
const messages = ref<any[]>([]);
const inputMessage = ref('');
const isGenerating = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteModalVisible = ref(false);
const currentParams = ref<Record<string, any>>({});
const messageAreaRef = ref<HTMLDivElement | null>(null);

const getDefaultTitle = (session: any) => {
  const date = new Date(session.created_at);
  const time = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `新对话 ${time}`;
};

const fetchSessions = async () => {
  try {
    const response = await getSessions();
    sessions.value = response.data;
  } catch (error) {
    console.error('获取会话列表失败:', error);
  }
};

const selectSession = async (id: number) => {
  currentSessionId.value = id;
  const session = sessions.value.find((s: any) => s.id === id);
  if (session) {
    currentMode.value = session.mode;
    if (session.mode === 'image') {
      currentParams.value = { resolution: '1K', ratio: '1:1', imageUrl: '' };
    } else if (session.mode === 'video') {
      currentParams.value = {
        model: 'doubao-seedance-1-5-pro-251215',
        resolution: '720p',
        ratio: '16:9',
        duration: 5,
        imageUrl: '',
        endImageUrl: '',
        generateAudio: false,
        draft: false,
      };
    } else {
      currentParams.value = {};
    }
  }
  await fetchMessages(id);
};

const fetchMessages = async (sessionId: number) => {
  try {
    const response = await getMessages(sessionId);
    messages.value = response.data;
    scrollToBottom();
    // 检查是否有后台正在处理但前端还没有收到完成消息的任务
    checkForLoading();
  } catch (error) {
    console.error('获取消息失败:', error);
  }
};

const checkForLoading = () => {
  // 如果最后一条 AI 消息是生成中的状态，启动轮询
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg && lastMsg.role === 'user') {
    // 用户发了消息但还没有收到 AI 回复（可能的 pending 状态）
    // 启动一次主动查询
    if (currentSessionId.value) {
      setTimeout(() => {
        fetchMessages(currentSessionId.value!);
      }, 2000);
    }
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messageAreaRef.value) {
      messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight;
    }
  });
};

const handleNewChat = async () => {
  try {
    const response = await createSession('chat');
    const newSession = response.data;
    await fetchSessions();
    await selectSession(newSession.id);
    // 选中新建的会话
    currentSessionId.value = newSession.id;
  } catch (error) {
    console.error('创建会话失败:', error);
    message.error('创建会话失败');
  }
};

const showDeleteConfirm = (id: number) => {
  deleteTargetId.value = id;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (deleteTargetId.value === null) return;
  try {
    await deleteSession(deleteTargetId.value);
    await fetchSessions();
    if (currentSessionId.value === deleteTargetId.value) {
      currentSessionId.value = null;
      messages.value = [];
    }
    message.success('删除成功');
  } catch (error) {
    console.error('删除会话失败:', error);
    message.error('删除失败');
  }
  deleteModalVisible.value = false;
  deleteTargetId.value = null;
};

const handleModeChanged = (sessionId: number, mode: string) => {
  fetchSessions();
  selectSession(sessionId);
};

const handleImageUploaded = (base64: string) => {
  currentParams.value.imageUrl = base64;
};

const handleParamsUpdate = (params: Record<string, any>) => {
  currentParams.value = { ...params };
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleSend = async () => {
  const msg = inputMessage.value.trim();
  if (!msg || !currentSessionId.value || isGenerating.value) return;

  // 立即追加用户消息到本地列表
  const userMsg = {
    id: Date.now(),
    session_id: currentSessionId.value,
    role: 'user',
    content: msg,
    type: 'text',
    result_url: '',
  };
  messages.value.push(userMsg);
  inputMessage.value = '';
  isGenerating.value = true;
  scrollToBottom();

  try {
    const response = await sendMessage({
      sessionId: currentSessionId.value,
      message: msg,
      mode: currentMode.value,
      params: currentParams.value,
    });

    if (currentMode.value === 'chat') {
      // 普通对话：同步返回
      isGenerating.value = false;
      // 重新获取最新消息
      await fetchMessages(currentSessionId.value);
    } else {
      // 生成对话：异步 processing，启动轮询
      const sessionId = currentSessionId.value;
      pollForResult(sessionId);
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    message.error('发送失败');
    isGenerating.value = false;
  }
};

const pollForResult = async (sessionId: number) => {
  // 最多轮询 60 次（3 分钟）
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const response = await getMessages(sessionId);
      const latestMessages = response.data;
      const lastMsg = latestMessages[latestMessages.length - 1];

      // 检查是否有新的 AI 消息（非 loading 状态）
      const prevMsgCount = messages.value.length;
      if (latestMessages.length > prevMsgCount) {
        messages.value = latestMessages;
        isGenerating.value = false;
        scrollToBottom();
        return;
      }
    } catch (error) {
      console.error('轮询失败:', error);
    }
  }
  // 超时
  isGenerating.value = false;
  message.warning('生成超时，请查看结果或重试');
};

// 监听会话切换时清除生成状态
watch(currentSessionId, () => {
  isGenerating.value = false;
});

onMounted(async () => {
  await fetchSessions();
  if (sessions.value.length > 0) {
    await selectSession(sessions.value[0].id);
  }
});
</script>

<style scoped>
.chat-view {
  display: flex;
  height: calc(100vh - 140px);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.chat-sidebar {
  width: 240px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.sidebar-item {
  padding: 10px 12px;
  cursor: pointer;
  position: relative;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.sidebar-item:hover {
  background: #e6f7ff;
}

.sidebar-item.is-active {
  background: #e6f7ff;
  border-right: 3px solid #1677ff;
}

.item-title {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 24px;
}

.item-meta {
  font-size: 11px;
  color: #999;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.sidebar-item:hover .delete-btn {
  display: flex;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-width: 0;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
  margin-bottom: 8px;
}

.input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 8px;
}

.send-btn {
  flex-shrink: 0;
  margin-bottom: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>