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
      <template v-if="showEditor">
        <!-- 消息气泡区 -->
        <div class="message-area" ref="messageAreaRef" @scroll="handleScroll">
          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :role="msg.role"
            :content="msg.content"
            :type="msg.type"
            :result-url="msg.result_url"
            :params="msg.params"
            @reuse-params="handleReuseParams"
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
          @switch-mode-local="handleSwitchModeLocal"
        />

        <!-- 模板与预设快捷按钮 -->
        <div class="template-shortcut" v-if="currentMode !== 'chat'">
          <a-button size="small" @click="templatePanelVisible = !templatePanelVisible">
            {{ templatePanelVisible ? '▲ 收起模板与预设' : '📚 模板与预设' }}
          </a-button>
        </div>

        <!-- 模板与预设面板 -->
        <ChatTemplatePanel
          :visible="templatePanelVisible"
          :current-mode="currentMode"
          @apply="handleTemplateApply"
        />

        <!-- 参数面板 -->
        <ChatParamsPanel
          :mode="currentMode"
          :params="currentParams"
          :last-params="lastGenerationParams"
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

      <!-- 无编辑状态 -->
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

    <!-- 模式切换确认弹窗（模板/预设跨模式应用） -->
    <a-modal
      v-model:open="modeSwitchModalVisible"
      title="切换模式"
      @ok="confirmModeSwitch"
      @cancel="modeSwitchModalVisible = false"
      ok-text="确认切换"
    >
      <p>{{ modeSwitchModalContent }}</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { message } from 'ant-design-vue';
import { SendOutlined } from '@ant-design/icons-vue';
import ChatMessage from '../components/ChatMessage.vue';
import ChatToolbar from '../components/ChatToolbar.vue';
import ChatParamsPanel from '../components/ChatParamsPanel.vue';
import ChatTemplatePanel from '../components/ChatTemplatePanel.vue';
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
const lastGenerationParams = ref<Record<string, any> | null>(null);
const messageAreaRef = ref<HTMLDivElement | null>(null);
const isUserScrolledUp = ref(false);
const templatePanelVisible = ref(false);

// 标识是否有"待创建"的编辑状态（会话还未持久化到数据库）
const hasPendingEditor = ref(false);

// 显示编辑器的条件：已选中某会话 OR 有未创建的待编辑状态
const showEditor = computed(() => currentSessionId !== null || hasPendingEditor.value);

// 模板/预设跨模式切换确认
const modeSwitchModalVisible = ref(false);
const modeSwitchModalContent = ref('');
const pendingTemplateApply = ref<{ prompt: string; params: Record<string, any>; mode: string } | null>(null);

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
  hasPendingEditor.value = false;
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
    lastGenerationParams.value = null;
  }
  await fetchMessages(id);
};

const fetchMessages = async (sessionId: number) => {
  try {
    const response = await getMessages(sessionId);
    messages.value = response.data;
    updateLastGenerationParams();
    scrollToBottom();
  } catch (error) {
    console.error('获取消息失败:', error);
  }
};

const updateLastGenerationParams = () => {
  const lastGenMsg = [...messages.value].reverse().find(
    (m: any) => m.role === 'assistant' && (m.type === 'image' || m.type === 'video') && m.params
  );
  if (lastGenMsg) {
    try {
      lastGenerationParams.value = JSON.parse(lastGenMsg.params);
    } catch {
      lastGenerationParams.value = null;
    }
  }
};

const handleScroll = () => {
  if (!messageAreaRef.value) return;
  const el = messageAreaRef.value;
  const threshold = 50;
  isUserScrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > threshold;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messageAreaRef.value && !isUserScrolledUp.value) {
      messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight;
    }
  });
};

/**
 * 初始化一个待创建的编辑器状态（不调 API，不持久化）
 */
function initPendingEditor(mode: string) {
  hasPendingEditor.value = true;
  currentSessionId.value = null;
  currentMode.value = mode;
  messages.value = [];
  lastGenerationParams.value = null;
  templatePanelVisible.value = false;

  if (mode === 'image') {
    currentParams.value = { resolution: '1K', ratio: '1:1', imageUrl: '' };
  } else if (mode === 'video') {
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

  // 所有模式都插入本地欢迎语（首次发送时 fetchMessages 会被服务端数据覆盖）
  messages.value.push({
    id: -1,
    session_id: -1,
    role: 'assistant',
    content: '你好，我是您的人工助手，请问需要什么帮助？',
    type: 'text',
    result_url: '',
  });
}

// 新建对话：只初始化本地状态，不调 createSession API
const handleNewChat = () => {
  initPendingEditor('chat');
  inputMessage.value = '';
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
      hasPendingEditor.value = false;
    }
    message.success('删除成功');
  } catch (error) {
    console.error('删除会话失败:', error);
    message.error('删除失败');
  }
  deleteModalVisible.value = false;
  deleteTargetId.value = null;
};

const handleModeChanged = (sessionId: number, _mode: string) => {
  fetchSessions();
  selectSession(sessionId);
};

/** 工具栏"切换模式"确认后调用（本地切换，不调 createSession） */
const handleSwitchModeLocal = (targetMode: string) => {
  initPendingEditor(targetMode);
  inputMessage.value = '';
};

const handleImageUploaded = (base64: string) => {
  currentParams.value.imageUrl = base64;
};

const handleParamsUpdate = (params: Record<string, any>) => {
  currentParams.value = { ...params };
};

const handleReuseParams = (params: Record<string, any>) => {
  currentParams.value = { ...params };
  message.success('参数已填充到面板');
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

/**
 * 处理模板/预设"应用"事件
 */
const handleTemplateApply = (data: { prompt: string; params: Record<string, any>; mode: string }) => {
  templatePanelVisible.value = false;

  // 如果当前无编辑器，或模式匹配，直接填充
  if (!showEditor.value || currentMode.value === data.mode) {
    applyTemplateData(data);
    return;
  }

  // 模式不匹配，弹出确认
  const modeLabel = data.mode === 'image' ? '图像生成' : '视频生成';
  modeSwitchModalContent.value = `当前为${currentMode.value === 'image' ? '图像' : '视频'}对话，该模板为${modeLabel}模式。是否切换到${modeLabel}？`;
  pendingTemplateApply.value = data;
  modeSwitchModalVisible.value = true;
};

/** 确认跨模式切换 */
const confirmModeSwitch = () => {
  if (!pendingTemplateApply.value) return;
  const data = pendingTemplateApply.value;
  // 直接切换本地状态，不调 createSession
  initPendingEditor(data.mode);
  applyTemplateData(data);
  modeSwitchModalVisible.value = false;
  pendingTemplateApply.value = null;
};

/** 填充模板/预设数据到输入框和参数面板 */
const applyTemplateData = (data: { prompt: string; params: Record<string, any>; mode: string }) => {
  // 总是重置本地编辑器状态，确保界面完全刷新（和侧边栏"我的预设"行为一致）
  initPendingEditor(data.mode);
  inputMessage.value = data.prompt;
  currentParams.value = { ...currentParams.value, ...data.params };
  message.success('已填充模板参数');
};

const handleSend = async () => {
  const msg = inputMessage.value.trim();
  if (!msg || isGenerating.value) return;

  // 先准备好会话 ID（有 pending 就先创建）
  let sessionId = currentSessionId.value;
  if (sessionId === null && hasPendingEditor.value) {
    try {
      const response = await createSession(currentMode.value);
      const newSession = response.data;
      sessionId = newSession.id;
      currentSessionId.value = newSession.id;
      hasPendingEditor.value = false;
      await fetchSessions();
    } catch (error) {
      console.error('创建会话失败:', error);
      message.error('创建会话失败');
      return;
    }
  }

  if (sessionId === null) {
    message.error('请先选择或创建一个对话');
    return;
  }

  // ===== 关键：用 setTimeout 将 UI 更新和网络请求拆到两个宏任务 =====
  // 这样浏览器能在第一个宏任务中绘制出 loading 气泡
  setTimeout(async () => {
    isGenerating.value = true;

    const regenerateKeywords = ['重新生成', '再来一次', '再生成', '再来一张', '再来一段', '重做'];
    const isRegenerate = regenerateKeywords.some(kw => msg.includes(kw));

    messages.value.push({
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: msg,
      type: 'text',
      result_url: '',
    });
    inputMessage.value = '';
    scrollToBottom();

    // 给浏览器 200ms 绘制 UI（用户消息 + loading 气泡）
    await new Promise((r) => setTimeout(r, 200));

    try {
      const networkPromise = sendMessage({
        sessionId,
        message: msg,
        mode: currentMode.value,
        params: currentParams.value,
        isRegenerate,
      }).catch(() => {});

      if (currentMode.value === 'chat') {
        await networkPromise;
        isGenerating.value = false;
        await fetchMessages(sessionId);
      } else {
        const minLoad = new Promise((r) => setTimeout(r, 2000));
        pollForResult(sessionId);
        await minLoad;
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送失败');
      isGenerating.value = false;
    }
  }, 0);
};

const pollForResult = async (sessionId: number) => {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const response = await getMessages(sessionId);
      const latestMessages = response.data;
      // 服务端消息数（排除本地欢迎语 id<0）
      const serverMsgCount = messages.value.filter((m: any) => m.id > 0).length;
      if (latestMessages.length > serverMsgCount) {
        messages.value = latestMessages;
        updateLastGenerationParams();
        isGenerating.value = false;
        scrollToBottom();
        return;
      }
    } catch (error) {
      console.error('轮询失败:', error);
    }
  }
  isGenerating.value = false;
  message.warning('生成超时，请查看结果或重试');
};

watch(currentSessionId, () => {
  isGenerating.value = false;
  isUserScrolledUp.value = false;
});

// 从 sessionStorage 读取模板/预设应用数据（来自 TemplateLibrary / MyPresets 页面）
// 不再调 createSession，而是设置为待创建状态
onMounted(async () => {
  await fetchSessions();

  const stored = sessionStorage.getItem('applyTemplate');
  if (stored) {
    sessionStorage.removeItem('applyTemplate');
    try {
      const data = JSON.parse(stored);
      initPendingEditor(data.mode);
      currentParams.value = { ...currentParams.value, ...data.params };
      inputMessage.value = data.prompt;
      message.success('已应用模板参数');
    } catch (error) {
      console.error('应用模板失败:', error);
    }
    return;
  }

  // 默认选中第一个会话
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

.template-shortcut {
  padding: 4px 0;
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