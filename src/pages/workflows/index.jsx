import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from '../../h5-components';
import Taro from '@tarojs/taro';
import {
  api,
  buildPosterGraph,
  componentLabel,
  extractDraftFromWorkflow,
  graphSummary,
  money,
  navigateTo,
  normalizePage,
  queryFrom,
  requireAuth,
  shortText,
  statusText,
} from '../../lib';
import {
  ActionButton,
  ComponentChip,
  copyText,
  EmptyState,
  PageShell,
  Pager,
  Section,
  SelectField,
  StatGrid,
  StatusPill,
  TextAreaField,
  TextField,
  WorkflowChain,
} from '../../ui';

const paletteOptions = [
  { label: '低饱和新扁平', value: '低饱和新扁平' },
  { label: '新拟物柔光', value: '新拟物柔光' },
  { label: '黑白极简', value: '黑白极简' },
  { label: '科技冷调', value: '科技冷调' },
];

const sizeOptions = [
  { label: '方图 1024x1024', value: '1024x1024' },
  { label: '海报 1080x1440', value: '1080x1440' },
  { label: '小程序卡片 750x1000', value: '750x1000' },
  { label: '横幅 1600x900', value: '1600x900' },
];

const emptyDraft = {
  id: null,
  title: '',
  description: '',
  prompt: '',
  posterTitle: '',
  palette: '低饱和新扁平',
  width: 1024,
  height: 1024,
  includeResize: false,
  licenseMode: 'closed',
  tags: '海报,自动化',
};

function draftGraph(draft) {
  return buildPosterGraph(draft);
}

function parseSize(value) {
  const [width, height] = String(value).split('x').map((part) => Number(part));
  return { width: width || 1024, height: height || 1024 };
}

function sizeValue(draft) {
  return `${draft.width}x${draft.height}`;
}

function readWorkflowManifestFile() {
  if (typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json,.seeflow';
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) return reject(new Error('未选择文件'));
          resolve(JSON.parse(await file.text()));
        } catch (error) {
          reject(error);
        }
      };
      input.click();
    });
  }

  if (typeof Taro.chooseMessageFile === 'function') {
    return Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['json', 'seeflow'] })
      .then((result) => {
        const filePath = result.tempFiles?.[0]?.path;
        const fileSystem = Taro.getFileSystemManager?.();
        if (!filePath || !fileSystem) throw new Error('当前端不支持读取该文件');
        return JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
      });
  }

  return Promise.reject(new Error('当前端暂不支持选择 workflow 文件'));
}

function downloadWorkflowManifest(manifest, filename) {
  const text = typeof manifest === 'string' ? manifest : JSON.stringify(manifest, null, 2);
  if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }
  copyText(text, '已复制导出文件');
  return false;
}

export default function WorkflowsPage() {
  const [draft, setDraft] = useState(emptyDraft);
  const [filters, setFilters] = useState({ page: 1, pageSize: 6, q: '', status: 'all' });
  const [page, setPage] = useState(normalizePage([], 6));
  const [components, setComponents] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const graph = useMemo(() => draftGraph(draft), [draft]);
  const patchDraft = (values) => setDraft((prev) => ({ ...prev, ...values }));

  const load = async (nextFilters = filters) => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const [workflowPayload, componentPayload] = await Promise.all([
        api(`/api/workflows${queryFrom(nextFilters)}`),
        api('/api/components'),
      ]);
      setPage(normalizePage(workflowPayload, nextFilters.pageSize));
      setComponents(Array.isArray(componentPayload) ? componentPayload : []);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '工作流加载失败。');
    }
  };

  const refreshEstimate = async (nextGraph = graph) => {
    try {
      const estimatePath = draft.id ? `/api/workflows/${draft.id}/estimate` : '/api/billing/estimate';
      const result = await api(estimatePath, {
        method: 'POST',
        data: { graph: nextGraph },
      });
      setEstimate(result.estimatedCostCents ?? 0);
    } catch {
      setEstimate(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    refreshEstimate(graph);
  }, [graph]);

  const resetDraft = () => {
    setSelected(null);
    setDraft({ ...emptyDraft, title: `移动端工作流 ${new Date().toLocaleDateString('zh-CN')}` });
    setTone('info');
    setMessage('已打开新的 no-code 链路草稿。');
  };

  const pickWorkflow = async (workflow) => {
    setBusy(`pick-${workflow.id}`);
    try {
      const detail = await api(`/api/workflows/${workflow.id}`);
      setSelected(detail);
      setDraft({ ...emptyDraft, ...extractDraftFromWorkflow(detail) });
      setTone('good');
      setMessage(`已载入「${detail.title}」。`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '工作流详情加载失败。');
    } finally {
      setBusy('');
    }
  };

  const saveWorkflow = async () => {
    if (!draft.title.trim()) {
      setTone('error');
      setMessage('请先填写工作流名称。');
      return;
    }
    if (!draft.prompt.trim()) {
      setTone('error');
      setMessage('请填写默认提示词，运行时仍可覆盖。');
      return;
    }

    setBusy('save');
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        graph,
      };
      let detail;
      if (draft.id) {
        await api(`/api/workflows/${draft.id}/draft`, { method: 'PUT', data: payload });
        detail = await api(`/api/workflows/${draft.id}`);
      } else {
        detail = await api('/api/workflows', { method: 'POST', data: payload });
      }
      setSelected(detail);
      setDraft({ ...emptyDraft, ...extractDraftFromWorkflow(detail) });
      setTone('good');
      setMessage('工作流已保存为草稿。');
      await load({ ...filters, page: 1 });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '保存失败，请检查链路配置。');
    } finally {
      setBusy('');
    }
  };

  const validateWorkflow = async () => {
    if (!draft.id) {
      setTone('error');
      setMessage('请先保存工作流，再执行校验。');
      return;
    }
    setBusy('validate');
    try {
      const result = await api(`/api/workflows/${draft.id}/validate`, { method: 'POST' });
      setTone(result.valid ? 'good' : 'error');
      setMessage(result.valid ? '链路校验通过，可以运行或发布。' : `校验失败：${(result.errors || []).join('、')}`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '校验失败。');
    } finally {
      setBusy('');
    }
  };

  const runWorkflow = async () => {
    if (!draft.id) {
      setTone('error');
      setMessage('请先保存工作流，再运行测试任务。');
      return;
    }
    setBusy('run');
    try {
      const result = await api(`/api/workflows/${draft.id}/run`, {
        method: 'POST',
        data: {
          prompt: draft.prompt,
          title: draft.posterTitle || draft.title,
          palette: draft.palette,
        },
      });
      setTone('good');
      setMessage(`任务 #${result.taskId} 已创建，可在调用记录中查看。`);
      Taro.showToast({ title: '任务已创建', icon: 'none' });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '运行失败，请检查余额和模型状态。');
    } finally {
      setBusy('');
    }
  };

  const publishWorkflow = async () => {
    if (!draft.id) {
      setTone('error');
      setMessage('请先保存工作流，再发布到创意工坊。');
      return;
    }
    setBusy('publish');
    try {
      await api(`/api/workflows/${draft.id}/publish`, {
        method: 'POST',
        data: {
          licenseMode: draft.licenseMode,
          tags: draft.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          summary: draft.description,
        },
      });
      setTone('good');
      setMessage(`已发布到创意工坊，授权方式：${draft.licenseMode === 'open' ? '开源' : '闭源'}。`);
      await load({ ...filters, page: 1 });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '发布失败。');
    } finally {
      setBusy('');
    }
  };

  const exportWorkflow = async () => {
    if (!draft.id) {
      setTone('error');
      setMessage('请先保存工作流，再导出单文件。');
      return;
    }
    setBusy('export');
    try {
      const manifest = await api(`/api/workflows/${draft.id}/export`);
      const downloaded = downloadWorkflowManifest(manifest, `seefactory-workflow-${draft.id}.seeflow`);
      setTone('good');
      setMessage(downloaded ? '单文件 workflow manifest 已下载。' : '当前端已将单文件 workflow manifest 复制到剪贴板。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '导出失败。');
    } finally {
      setBusy('');
    }
  };

  const importWorkflow = async () => {
    setBusy('import');
    try {
      const manifest = await readWorkflowManifestFile();
      const detail = await api('/api/workflows/import', { method: 'POST', data: manifest });
      setSelected(detail);
      setDraft({ ...emptyDraft, ...extractDraftFromWorkflow(detail) });
      setTone('good');
      setMessage(`已导入 workflow：${detail.title}`);
      await load({ ...filters, page: 1 });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '导入失败，请检查单文件内容。');
    } finally {
      setBusy('');
    }
  };

  const applyFilters = (values) => {
    const next = { ...filters, ...values };
    setFilters(next);
    load(next);
  };

  return (
    <PageShell
      eyebrow="No-code Workflow"
      title="工作流控制台"
      subtitle="用表单、组件和纵向链路预览完成移动端工作流管理。"
      message={message}
      tone={tone}
      onRefresh={() => load(filters)}
      actions={[
        { label: '新建', primary: true, onClick: resetDraft },
        { label: '记录', onClick: () => navigateTo('/pages/tasks/index') },
        { label: '资产', onClick: () => Taro.navigateTo({ url: '/pages/assets/index' }) },
      ]}
    >
      <StatGrid
        items={[
          { label: '当前链路', value: draft.id ? `#${draft.id}` : '新草稿', hint: selected?.status ? statusText(selected.status) : '未保存', tone: 'dark' },
          { label: '节点', value: graph.nodes.length, hint: graphSummary(graph), tone: 'green' },
          { label: '预估费用', value: estimate === null ? '-' : money(estimate), hint: '按模型节点估算', tone: 'yellow' },
          { label: '输出尺寸', value: `${draft.width}x${draft.height}`, hint: '写入生成节点', tone: 'blue' },
        ]}
      />

      <Section title="链路编辑" subtitle="这里不是低代码 JSON，而是可直接点选和填写的 no-code 配置。">
        <View className="sf-form-panel">
          <TextField
            label="工作流名称"
            value={draft.title}
            placeholder="例如：小红书新品海报生成链"
            onChange={(value) => patchDraft({ title: value })}
          />
          <TextAreaField
            label="业务说明"
            value={draft.description}
            placeholder="这条链路解决什么问题，适合谁使用。"
            onChange={(value) => patchDraft({ description: value })}
          />
          <TextAreaField
            label="默认提示词"
            value={draft.prompt}
            placeholder="描述图片、视频或创意资产的输出目标。"
            onChange={(value) => patchDraft({ prompt: value })}
          />
          <TextField
            label="海报标题"
            value={draft.posterTitle}
            placeholder="运行时可覆盖"
            onChange={(value) => patchDraft({ posterTitle: value })}
          />
          <SelectField
            label="视觉风格"
            value={draft.palette}
            options={paletteOptions}
            onChange={(value) => patchDraft({ palette: value })}
          />
          <SelectField
            label="输出尺寸"
            value={sizeValue(draft)}
            options={sizeOptions}
            onChange={(value) => patchDraft(parseSize(value))}
          />
          <SelectField
            label="发布授权"
            value={draft.licenseMode}
            options={[
              { label: '闭源可运行', value: 'closed' },
              { label: '开源可克隆', value: 'open' },
            ]}
            onChange={(value) => patchDraft({ licenseMode: value })}
          />
          <TextField
            label="工坊标签"
            value={draft.tags}
            placeholder="用逗号分隔"
            onChange={(value) => patchDraft({ tags: value })}
          />
          <View className="sf-inline-actions">
            <ActionButton loading={busy === 'save'} onClick={saveWorkflow}>保存</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'validate'} onClick={validateWorkflow}>校验</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'run'} onClick={runWorkflow}>运行</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'publish'} onClick={publishWorkflow}>发布</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'export'} onClick={exportWorkflow}>导出</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'import'} onClick={importWorkflow}>导入</ActionButton>
          </View>
        </View>
      </Section>

      <Section title="链路预览" subtitle="用纵向链路确认输入、模型处理和输出节点。">
        <WorkflowChain graph={graph} />
      </Section>

      <Section title="组件库" subtitle="后端组件定义驱动，移动端用本地中文元信息修正展示。">
        <View className="sf-component-grid">
          {components.length ? (
            components.map((component) => (
              <ComponentChip component={component} key={component.component_key || component.key || component.id} />
            ))
          ) : (
            ['input.text', 'text.dialogue', 'vision.describe', 'image.poster.render', 'video.storyboard.generate', 'video.image.animate', 'asset.output'].map((key) => (
              <View className="sf-component-chip" key={key}>
                <Text className="sf-component-name">{componentLabel(key)}</Text>
                <Text className="sf-component-kind">{key}</Text>
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="我的工作流" subtitle="支持分页、搜索、状态筛选和继续编辑。">
        <View className="sf-toolbar">
          <TextField
            value={filters.q}
            placeholder="搜索名称或说明"
            onChange={(value) => setFilters((prev) => ({ ...prev, q: value }))}
          />
          <SelectField
            value={filters.status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
            ]}
            onChange={(value) => applyFilters({ status: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyFilters({ q: '', status: 'all', page: 1 })}>重置</ActionButton>
        </View>

        <View className="sf-form-spacer" />
        {page.items.length ? (
          page.items.map((workflow) => (
            <View className="sf-record" key={workflow.id} onClick={() => pickWorkflow(workflow)}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{workflow.title}</Text>
                  <Text className="sf-record-sub">{shortText(workflow.description || graphSummary(workflow.graph))}</Text>
                </View>
                <StatusPill status={workflow.status}>{statusText(workflow.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{graphSummary(workflow.graph)}</Text>
                <Text>{busy === `pick-${workflow.id}` ? '加载中' : `v${workflow.latest_version || 1}`}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="没有匹配的工作流" subtitle="新建一个链路，或调整搜索和状态筛选。" />
        )}
        <Pager
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          onChange={(nextPage) => applyFilters({ page: nextPage })}
        />
      </Section>
    </PageShell>
  );
}
