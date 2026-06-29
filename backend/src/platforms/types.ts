export interface AIGCPlatformAdapter {
  name: string;

  submitTask(
    content: string,
    type: 'image' | 'video',
    options?: {
      model?: string;
      resolution?: string;
      ratio?: string;
      duration?: number;
      imageUrl?: string;
      endImageUrl?: string;
      generateAudio?: boolean;
      draft?: boolean;
    }
  ): Promise<{ platformTaskId: string }>;

  queryTask(platformTaskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    errorMessage?: string;
  }>;
}
