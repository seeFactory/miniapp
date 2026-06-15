import React, { useEffect, useState } from 'react';
import { View, Text } from '../../h5-components';
import Taro from '@tarojs/taro';
import {
  api,
  dateTime,
  graphSummary,
  licenseText,
  normalizePage,
  queryFrom,
  requireAuth,
  shortText,
} from '../../lib';
import {
  ActionButton,
  EmptyState,
  PageShell,
  Pager,
  Section,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  WorkflowChain,
} from '../../ui';

export default function WorkshopPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 6, q: '', licenseMode: 'all' });
  const [page, setPage] = useState(normalizePage([], 6));
  const [selected, setSelected] = useState(null);
  const [runPrompt, setRunPrompt] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async (nextFilters = filters) => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const payload = await api(`/api/workshop/items${queryFrom(nextFilters)}`);
      setPage(normalizePage(payload, nextFilters.pageSize));
    } catch (error) {
      setTone('error');
      setMessage(error.message || '创意工坊加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyFilters = (values) => {
    const next = { ...filters, ...values };
    setFilters(next);
    load(next);
  };

  const openItem = async (item) => {
    setBusy(`open-${item.id}`);
    try {
      const detail = await api(`/api/workshop/items/${item.id}`);
      setSelected(detail);
      setRunPrompt(detail.summary || '');
      setTone('good');
      setMessage(`已打开「${detail.title}」。`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '作品详情加载失败。');
    } finally {
      setBusy('');
    }
  };

  const runItem = async (item = selected) => {
    if (!item?.id) {
      setTone('error');
      setMessage('请先选择一个工坊样例。');
      return;
    }
    setBusy(`run-${item.id}`);
    try {
      const result = await api(`/api/workshop/items/${item.id}/run`, {
        method: 'POST',
        data: { prompt: runPrompt || item.summary || item.title },
      });
      setTone('good');
      setMessage(`任务 #${result.taskId} 已创建，可在调用记录查看。`);
      Taro.showToast({ title: '任务已创建', icon: 'none' });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '运行失败，请检查余额。');
    } finally {
      setBusy('');
    }
  };

  const cloneItem = async (item = selected) => {
    if (!item?.id) return;
    if (item.license_mode !== 'open') {
      setTone('error');
      setMessage('只有开源工坊作品可以克隆为自己的工作流。');
      return;
    }
    setBusy(`clone-${item.id}`);
    try {
      const result = await api(`/api/workshop/items/${item.id}/clone`, { method: 'POST' });
      setTone('good');
      setMessage(`已克隆为工作流 #${result.workflowId}。`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '克隆失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <PageShell
      eyebrow="Creative Workshop"
      title="创意工坊"
      subtitle="挑选样例直接运行；开源作品可以克隆成自己的 workflow 再继续改。"
      message={message}
      tone={tone}
      onRefresh={() => load(filters)}
    >
      <Section title="筛选">
        <View className="sf-toolbar">
          <TextField
            value={filters.q}
            placeholder="搜索标题、作者、标签"
            onChange={(value) => setFilters((prev) => ({ ...prev, q: value }))}
          />
          <SelectField
            value={filters.licenseMode}
            options={[
              { label: '全部授权', value: 'all' },
              { label: '开源', value: 'open' },
              { label: '闭源', value: 'closed' },
            ]}
            onChange={(value) => applyFilters({ licenseMode: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyFilters({ q: '', licenseMode: 'all', page: 1 })}>重置</ActionButton>
        </View>
      </Section>

      <Section title="样例列表" subtitle="每个样例都可以直接发起模型调度任务。">
        {page.items.length ? (
          page.items.map((item) => (
            <View className="sf-record" key={item.id} onClick={() => openItem(item)}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{item.title}</Text>
                  <Text className="sf-record-sub">{shortText(item.summary || '可直接运行的创意链路。')}</Text>
                </View>
                <StatusPill status={item.license_mode === 'open' ? 'published' : 'draft'}>
                  {licenseText(item.license_mode)}
                </StatusPill>
              </View>
              <View className="sf-tag-row">
                {(item.tags || []).slice(0, 3).map((tag) => <Text className="sf-tag" key={tag}>{tag}</Text>)}
              </View>
              <View className="sf-record-foot">
                <Text>{item.author_name || '创作者'}</Text>
                <Text>{busy === `open-${item.id}` ? '加载中' : `运行 ${item.run_count || 0}`}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="没有找到样例" subtitle="调整筛选条件，或先发布一个自己的工作流。" />
        )}
        <Pager page={page.page} totalPages={page.totalPages} total={page.total} onChange={(nextPage) => applyFilters({ page: nextPage })} />
      </Section>

      <Section title="样例详情" subtitle={selected ? `更新于 ${dateTime(selected.updated_at || selected.created_at)}` : '选择一个样例后查看链路与运行参数。'}>
        {selected ? (
          <View className="sf-form-panel">
            <Text className="sf-record-title">{selected.title}</Text>
            <Text className="sf-record-sub">{selected.summary || selected.description || '暂无说明。'}</Text>
            <View className="sf-form-spacer" />
            <TextAreaField
              label="运行提示词"
              value={runPrompt}
              placeholder="输入本次调用的生成要求"
              onChange={setRunPrompt}
            />
            {selected.graph ? (
              <WorkflowChain graph={selected.graph} compact />
            ) : (
              <EmptyState title="闭源链路" subtitle="该作品允许运行，但不会公开内部 graph。" />
            )}
            {selected.graph ? <Text className="sf-record-sub">{graphSummary(selected.graph)}</Text> : null}
            <View className="sf-inline-actions">
              <ActionButton loading={busy === `run-${selected.id}`} onClick={() => runItem(selected)}>运行样例</ActionButton>
              <ActionButton variant="secondary" loading={busy === `clone-${selected.id}`} onClick={() => cloneItem(selected)}>克隆</ActionButton>
            </View>
          </View>
        ) : (
          <EmptyState title="未选择样例" subtitle="点击上方任意工坊作品查看详情。" />
        )}
      </Section>
    </PageShell>
  );
}
