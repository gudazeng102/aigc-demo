export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  prompt: string;
  params: Record<string, any>;
}

export interface TemplateGroup {
  image: TemplateItem[];
  video: TemplateItem[];
}

export const SYSTEM_TEMPLATES: TemplateGroup = {
  image: [
    {
      id: 'tpl-img-1',
      name: '电商主图',
      description: '白色背景，产品居中，适合淘宝/京东详情页',
      prompt: '产品宣传图，白色纯净背景，产品居中展示，专业摄影灯光，电商详情页风格',
      params: { resolution: '1K', ratio: '1:1' },
    },
    {
      id: 'tpl-img-2',
      name: '社交媒体封面',
      description: '竖版图文，适合小红书/朋友圈',
      prompt: '社交媒体封面图，竖版构图，精美排版，适合小红书风格',
      params: { resolution: '1K', ratio: '3:4' },
    },
    {
      id: 'tpl-img-3',
      name: '横幅海报',
      description: '宽屏展示，适合网站 Banner',
      prompt: '横幅海报，宽屏构图，视觉冲击力强，适合网站顶部展示',
      params: { resolution: '2K', ratio: '16:9' },
    },
    {
      id: 'tpl-img-4',
      name: '头像生成',
      description: '1:1 比例，精致面部特写',
      prompt: '精致头像，面部特写，1:1比例，高清质感，专业肖像摄影',
      params: { resolution: '1K', ratio: '1:1' },
    },
    {
      id: 'tpl-img-5',
      name: '产品特写',
      description: '突出产品细节，微距质感',
      prompt: '产品特写镜头，微距摄影，突出材质纹理和细节，高级感',
      params: { resolution: '2K', ratio: '1:1' },
    },
  ],
  video: [
    {
      id: 'tpl-vid-1',
      name: '产品宣传片',
      description: '电影级运镜，品牌质感',
      prompt: '产品宣传片，电影级运镜，品牌质感，专业光影，高端氛围',
      params: {
        model: 'doubao-seedance-1-5-pro-251215',
        resolution: '1080p',
        ratio: '16:9',
        duration: 5,
        generateAudio: false,
        draft: false,
      },
    },
    {
      id: 'tpl-vid-2',
      name: '抖音带货',
      description: '竖屏快节奏，完播率优先',
      prompt: '抖音带货视频，竖屏快节奏，产品展示，吸引注意力，适合短视频平台',
      params: {
        model: 'doubao-seedance-1-0-pro-fast-251015',
        resolution: '720p',
        ratio: '9:16',
        duration: 3,
        generateAudio: false,
        draft: false,
      },
    },
    {
      id: 'tpl-vid-3',
      name: '品牌故事',
      description: '横屏叙事，情感氛围',
      prompt: '品牌故事视频，横屏叙事，情感氛围，温暖色调，故事感强',
      params: {
        model: 'doubao-seedance-1-5-pro-251215',
        resolution: '1080p',
        ratio: '16:9',
        duration: 10,
        generateAudio: false,
        draft: false,
      },
    },
    {
      id: 'tpl-vid-4',
      name: '快速预览',
      description: '草稿模式，快速验证创意',
      prompt: '快速预览视频，草稿模式，快速验证创意概念',
      params: {
        model: 'doubao-seedance-1-5-pro-251215',
        resolution: '480p',
        ratio: '16:9',
        duration: 3,
        generateAudio: false,
        draft: true,
      },
    },
    {
      id: 'tpl-vid-5',
      name: '动态海报',
      description: '短时长循环，适合社交媒体',
      prompt: '动态海报视频，短时长循环，适合社交媒体发布，视觉吸引力强',
      params: {
        model: 'doubao-seedance-1-0-pro-fast-251015',
        resolution: '720p',
        ratio: '1:1',
        duration: 2,
        generateAudio: false,
        draft: false,
      },
    },
  ],
};