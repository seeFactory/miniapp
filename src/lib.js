import Taro from '@tarojs/taro';

const configuredApiBase =
  typeof process !== 'undefined' && process.env ? process.env.TARO_APP_API_BASE : '';

export const API_BASE =
  configuredApiBase ||
  (typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}:18280`
    : 'http://localhost:18280');

const TOKEN_KEY = 'seefactory_token';

export function getToken() {
  return Taro.getStorageSync(TOKEN_KEY) || '';
}

export function setToken(token) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY);
}

export function requireAuth() {
  if (!getToken()) {
    Taro.navigateTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await Taro.request({
    url: `${API_BASE}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: headers,
  });

  const payload = response.data || {};
  if (response.statusCode === 401 || response.statusCode === 403) {
    clearToken();
    Taro.navigateTo({ url: '/pages/login/index' });
    throw new Error(payload.error?.message || '登录状态已失效，请重新登录');
  }

  if (response.statusCode >= 400 || payload.success === false) {
    throw new Error(payload.error?.message || payload.message || '请求失败');
  }

  return payload.data ?? payload;
}

export function queryFrom(params = {}) {
  const parts = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

export function normalizePage(payload, fallbackPageSize = 10) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      pageSize: fallbackPageSize,
      total: payload.length,
      totalPages: 1,
    };
  }

  const items = payload?.items || payload?.list || payload?.rows || [];
  const page = Number(payload?.page || payload?.pagination?.page || 1);
  const pageSize = Number(payload?.pageSize || payload?.pagination?.pageSize || fallbackPageSize);
  const total = Number(payload?.total || payload?.pagination?.total || items.length || 0);
  const totalPages = Math.max(1, Number(payload?.totalPages || Math.ceil(total / pageSize) || 1));

  return { items, page, pageSize, total, totalPages };
}

export function money(cents = 0) {
  const value = Number(cents || 0) / 100;
  return `¥${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

export function dateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortText(value = '', length = 42) {
  const text = String(value || '').trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function safeJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function assetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

const STATUS_TEXT = {
  draft: '草稿',
  published: '已发布',
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  pending: '待支付',
  paid: '已支付',
  active: '启用',
  disabled: '停用',
};

const STATUS_CLASS = {
  draft: 'neutral',
  published: 'good',
  queued: 'pending',
  running: 'pending',
  succeeded: 'good',
  failed: 'danger',
  cancelled: 'neutral',
  pending: 'pending',
  paid: 'good',
  active: 'good',
  disabled: 'neutral',
};

export function statusText(status) {
  return STATUS_TEXT[status] || status || '-';
}

export function statusClass(status) {
  return STATUS_CLASS[status] || 'neutral';
}

export function visibilityText(value) {
  return value === 'public' ? '公开' : '私有';
}

export function licenseText(value) {
  const map = {
    open: '开源',
    closed: '闭源',
    commercial: '商业授权',
  };
  return map[value] || value || '未设置';
}

export function directionText(value) {
  return value === 'credit' ? '入账' : '扣费';
}

export function reasonText(value) {
  const map = {
    recharge: '充值',
    model_call: '模型调用',
    refund: '退款',
    adjustment: '调账',
  };
  return map[value] || value || '-';
}

export function assetTypeText(value) {
  const map = {
    image: '图片',
    video: '视频',
    file: '文件',
    poster: '海报',
    banner: 'Banner',
  };
  return map[value] || value || '资产';
}

export function modelName(model = {}) {
  return model.name || model.model_key || model.key || '模型';
}

const COMPONENT_META = {
  'input.text': {
    label: '文本输入',
    category: '输入',
    description: '运行时可填写的提示词、标题或业务参数。',
    tone: 'blue',
  },
  'input.asset': {
    label: '图片资产输入',
    category: '输入',
    description: '选择平台资产库中的图片或视频作为链路素材。',
    tone: 'blue',
  },
  'image.poster.render': {
    label: '海报图片渲染',
    category: '生成',
    description: '调用图片模型生成宣传海报、封面或营销图。',
    tone: 'green',
  },
  'image.resize': {
    label: '图片尺寸调整',
    category: '处理',
    description: '按目标尺寸输出适配小程序、H5 或广告位的图片。',
    tone: 'yellow',
  },
  'asset.output': {
    label: '资产输出',
    category: '输出',
    description: '将链路结果保存到资产库并返回下载地址。',
    tone: 'dark',
  },
};

export function componentMeta(key, fallback = {}) {
  return {
    label: fallback.label || COMPONENT_META[key]?.label || key || '组件',
    category: fallback.category || COMPONENT_META[key]?.category || '组件',
    description: fallback.description || COMPONENT_META[key]?.description || '',
    tone: COMPONENT_META[key]?.tone || 'neutral',
  };
}

export function componentLabel(key, fallback = {}) {
  return componentMeta(key, fallback).label;
}

export function graphNodes(graph) {
  return safeJson(graph, graph || {}).nodes || [];
}

export function graphSummary(graph) {
  const nodes = graphNodes(graph);
  const labels = nodes.map((node) => componentLabel(node.component || node.type || node.componentKey, node)).filter(Boolean);
  return labels.length ? labels.join(' -> ') : '尚未配置链路';
}

export function workflowSteps(graph) {
  const nodes = graphNodes(graph);
  if (!nodes.length) return [];
  return nodes.map((node, index) => {
    const componentKey = node.component || node.type || node.componentKey;
    const meta = componentMeta(componentKey, node);
    return {
      id: node.id || `${node.component}-${index}`,
      label: node.label || meta.label,
      component: componentKey,
      category: meta.category,
      tone: meta.tone,
      description: meta.description,
    };
  });
}

export function buildPosterGraph({
  prompt = '',
  posterTitle = '',
  palette = '低饱和新扁平',
  width = 1024,
  height = 1024,
  includeResize = true,
} = {}) {
  const nodes = [
    {
      id: 'input_prompt',
      type: 'input.text',
      componentKey: 'input.text',
      component: 'input.text',
      label: '文本输入',
      config: {
        name: 'prompt',
        placeholder: '描述你要生成的图片或视频内容',
        defaultValue: prompt,
      },
    },
    {
      id: 'poster_render',
      type: 'image.poster.render',
      componentKey: 'image.poster.render',
      component: 'image.poster.render',
      label: '海报图片渲染',
      config: {
        title: posterTitle || 'seeFactory 创意海报',
        palette,
        width: Number(width) || 1024,
        height: Number(height) || 1024,
      },
    },
  ];

  const edges = [
    {
      id: 'edge_input_to_render',
      source: 'input_prompt',
      target: 'poster_render',
    },
  ];

  let finalNode = 'poster_render';

  if (includeResize) {
    nodes.push({
      id: 'resize_output',
      type: 'image.resize',
      componentKey: 'image.resize',
      component: 'image.resize',
      label: '尺寸适配',
      config: {
        width: Number(width) || 1024,
        height: Number(height) || 1024,
      },
    });
    edges.push({
      id: 'edge_render_to_resize',
      source: 'poster_render',
      target: 'resize_output',
    });
    finalNode = 'resize_output';
  }

  nodes.push({
    id: 'asset_output',
    type: 'asset.output',
    componentKey: 'asset.output',
    component: 'asset.output',
    label: '资产输出',
    config: {
      assetType: 'image',
      visibility: 'private',
    },
  });
  edges.push({
    id: `edge_${finalNode}_to_output`,
    source: finalNode,
    target: 'asset_output',
  });

  return {
    schemaVersion: '1.0',
    kind: 'seeFactory.workflow',
    nodes,
    edges,
    runtime: {
      entry: 'input_prompt',
      output: 'asset_output',
    },
  };
}

export function extractDraftFromWorkflow(workflow = {}) {
  const nodes = graphNodes(workflow.graph);
  const input = nodes.find((node) => (node.component || node.type || node.componentKey) === 'input.text') || {};
  const render = nodes.find((node) => (node.component || node.type || node.componentKey) === 'image.poster.render') || {};
  const resize = nodes.find((node) => (node.component || node.type || node.componentKey) === 'image.resize') || {};
  const config = render.config || {};
  const resizeConfig = resize.config || {};

  return {
    id: workflow.id,
    title: workflow.title || '',
    description: workflow.description || '',
    prompt: input.config?.defaultValue || '',
    posterTitle: config.title || workflow.title || '',
    palette: config.palette || '低饱和新扁平',
    width: resizeConfig.width || config.width || 1024,
    height: resizeConfig.height || config.height || 1024,
    includeResize: Boolean(resize.id || !nodes.length),
    licenseMode: workflow.license_mode || workflow.licenseMode || 'closed',
    tags: Array.isArray(workflow.tags) ? workflow.tags.join(',') : workflow.tags || '',
    graph: workflow.graph || buildPosterGraph(),
  };
}

export function extractTaskAsset(task = {}) {
  const output = safeJson(task.output, task.output || {});
  return output.asset || output.result || output.url || '';
}

export function navigateTo(url) {
  const tabPages = ['/pages/home/index', '/pages/workflows/index', '/pages/workshop/index', '/pages/tasks/index', '/pages/profile/index'];
  if (tabPages.includes(url)) {
    return Taro.switchTab({ url });
  }
  return Taro.navigateTo({ url });
}
