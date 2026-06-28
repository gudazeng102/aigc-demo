export interface AIGCPlatformAdapter {
  name: string;

  /**
   * 提交生成任务，返回平台侧任务 ID
   */
  submitTask(content: string, type: 'image' | 'video'): Promise<{
    platformTaskId: string;
  }>;

  /**
   * 查询任务状态，返回统一格式的状态
   */
  queryTask(platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }>;
}
