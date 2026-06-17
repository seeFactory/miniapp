import React, { useEffect, useState } from 'react';
import { View, Text, Image } from '../../h5-components';
import {
  api,
  assetUrl,
  dateTime,
  extractTaskAsset,
  money,
  normalizePage,
  queryFrom,
  requireAuth,
  shortText,
  statusText,
} from '../../lib';
import {
  ActionButton,
  EmptyState,
  PageShell,
  Pager,
  Section,
  SelectField,
  StatusPill,
  TextField,
} from '../../ui';

export default function TasksPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 8, q: '', status: 'all' });
  const [providerFilters, setProviderFilters] = useState({ page: 1, pageSize: 8, q: '', status: 'all' });
  const [page, setPage] = useState(normalizePage([], 8));
  const [providerJobs, setProviderJobs] = useState(normalizePage([], 8));
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async (nextFilters = filters) => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const payload = await api(`/api/tasks${queryFrom(nextFilters)}`);
      setPage(normalizePage(payload, nextFilters.pageSize));
    } catch (error) {
      setTone('error');
      setMessage(error.message || '调用记录加载失败。');
    }
  };

  const loadProviderJobs = async (nextFilters = providerFilters) => {
    if (!requireAuth()) return;
    try {
      const payload = await api(`/api/provider-jobs${queryFrom(nextFilters)}`);
      setProviderJobs(normalizePage(payload, nextFilters.pageSize));
    } catch (error) {
      setTone('error');
      setMessage(error.message || 'Provider 任务加载失败。');
    }
  };

  useEffect(() => {
    load();
    loadProviderJobs();
  }, []);

  const applyFilters = (values) => {
    const next = { ...filters, ...values };
    setFilters(next);
    load(next);
  };

  const openTask = async (task) => {
    setBusy(`open-${task.id}`);
    try {
      const [detail, eventList] = await Promise.all([
        api(`/api/tasks/${task.id}`),
        api(`/api/tasks/${task.id}/events`),
      ]);
      setSelected(detail);
      setEvents(Array.isArray(eventList) ? eventList : []);
      setTone('good');
      setMessage(`已打开任务 #${task.id}。`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '任务详情加载失败。');
    } finally {
      setBusy('');
    }
  };

  const cancelTask = async () => {
    if (!selected?.id) return;
    setBusy('cancel');
    try {
      await api(`/api/tasks/${selected.id}/cancel`, { method: 'POST' });
      setTone('good');
      setMessage('已提交取消请求。');
      await openTask(selected);
      await load(filters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '取消失败。');
    } finally {
      setBusy('');
    }
  };

  const applyProviderFilters = (values) => {
    const next = { ...providerFilters, ...values };
    setProviderFilters(next);
    loadProviderJobs(next);
  };

  const refreshProviderJob = async (job) => {
    setBusy(`provider-${job.id}`);
    try {
      const next = await api(`/api/provider-jobs/${job.id}/refresh`, { method: 'POST' });
      setTone('good');
      setMessage(`Provider 任务 #${job.id} 已同步为 ${statusText(next.status)}。`);
      await loadProviderJobs(providerFilters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || 'Provider 任务同步失败。');
    } finally {
      setBusy('');
    }
  };

  const outputUrl = selected ? assetUrl(extractTaskAsset(selected)) : '';

  return (
    <PageShell
      eyebrow="Task Logs"
      title="调用记录"
      subtitle="按状态检索每一次 workflow 调度，查看事件、成本和输出资产。"
      message={message}
      tone={tone}
      onRefresh={() => {
        load(filters);
        loadProviderJobs(providerFilters);
      }}
    >
      <Section title="筛选">
        <View className="sf-toolbar">
          <TextField
            value={filters.q}
            placeholder="搜索任务 ID、状态或工作流"
            onChange={(value) => setFilters((prev) => ({ ...prev, q: value }))}
          />
          <SelectField
            value={filters.status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '排队中', value: 'queued' },
              { label: '运行中', value: 'running' },
              { label: '已完成', value: 'succeeded' },
              { label: '失败', value: 'failed' },
              { label: '已取消', value: 'cancelled' },
            ]}
            onChange={(value) => applyFilters({ status: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyFilters({ q: '', status: 'all', page: 1 })}>重置</ActionButton>
        </View>
      </Section>

      <Section title="任务列表">
        {page.items.length ? (
          page.items.map((task) => (
            <View className="sf-record" key={task.id} onClick={() => openTask(task)}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{task.workflow_title || task.workshop_title || `任务 #${task.id}`}</Text>
                  <Text className="sf-record-sub">{shortText(task.error_message || `输入：${JSON.stringify(task.input || {})}`, 52)}</Text>
                </View>
                <StatusPill status={task.status}>{statusText(task.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{money(task.cost_cents)}</Text>
                <Text>{busy === `open-${task.id}` ? '加载中' : dateTime(task.created_at)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="暂无任务" subtitle="运行工作流或工坊样例后，会在这里看到调用记录。" />
        )}
        <Pager page={page.page} totalPages={page.totalPages} total={page.total} onChange={(nextPage) => applyFilters({ page: nextPage })} />
      </Section>

      <Section title="Provider 视频任务" subtitle="跟踪上游异步生视频任务、回调等待和输出资产。">
        <View className="sf-toolbar">
          <TextField
            value={providerFilters.q}
            placeholder="搜索 Provider、模型、上游任务号"
            onChange={(value) => setProviderFilters((prev) => ({ ...prev, q: value }))}
          />
          <SelectField
            value={providerFilters.status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '排队中', value: 'queued' },
              { label: '运行中', value: 'running' },
              { label: '等待回调', value: 'waiting_callback' },
              { label: '已完成', value: 'succeeded' },
              { label: '失败', value: 'failed' },
              { label: '已取消', value: 'cancelled' },
            ]}
            onChange={(value) => applyProviderFilters({ status: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyProviderFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyProviderFilters({ q: '', status: 'all', page: 1 })}>重置</ActionButton>
        </View>
        <View className="sf-form-spacer" />
        {providerJobs.items.length ? (
          providerJobs.items.map((job) => (
            <View className="sf-record" key={job.id}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{job.model_key || `Provider Job #${job.id}`}</Text>
                  <Text className="sf-record-sub">{shortText(job.upstream_job_id || job.polling_url || job.provider_key, 56)}</Text>
                </View>
                <StatusPill status={job.status}>{statusText(job.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{job.provider_key} / {job.mode}</Text>
                <Text>{dateTime(job.updated_at || job.created_at)}</Text>
              </View>
              {job.error_message ? <Text className="sf-error-text">{job.error_message}</Text> : null}
              {['queued', 'running', 'waiting_callback'].includes(job.status) ? (
                <View className="sf-inline-actions">
                  <ActionButton variant="secondary" loading={busy === `provider-${job.id}`} onClick={() => refreshProviderJob(job)}>同步状态</ActionButton>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="暂无 Provider 视频任务" subtitle="运行文生视频或图生视频后，上游任务会显示在这里。" />
        )}
        <Pager page={providerJobs.page} totalPages={providerJobs.totalPages} total={providerJobs.total} onChange={(nextPage) => applyProviderFilters({ page: nextPage })} />
      </Section>

      <Section title="任务详情" subtitle={selected ? `任务 #${selected.id}` : '点击任务查看完整事件。'}>
        {selected ? (
          <View className="sf-form-panel">
            <View className="sf-record-head">
              <View className="sf-record-main">
                <Text className="sf-record-title">{selected.workflow_title || selected.workshop_title || `任务 #${selected.id}`}</Text>
                <Text className="sf-record-sub">创建于 {dateTime(selected.created_at)}，成本 {money(selected.cost_cents)}</Text>
              </View>
              <StatusPill status={selected.status}>{statusText(selected.status)}</StatusPill>
            </View>
            {selected.error_message ? <Text className="sf-error-text">{selected.error_message}</Text> : null}
            {outputUrl ? (
              <View className="sf-image-preview">
                <Image className="sf-preview-image" src={outputUrl} mode="aspectFill" />
              </View>
            ) : null}
            <View className="sf-event-list">
              {events.length ? (
                events.map((event) => (
                  <View className="sf-event" key={event.id}>
                    <Text className="sf-event-title">{event.event_type || event.type || `事件 #${event.id}`}</Text>
                    <Text className="sf-event-time">{dateTime(event.created_at)}</Text>
                  </View>
                ))
              ) : (
                <EmptyState title="暂无事件" subtitle="该任务还没有写入事件时间线。" />
              )}
            </View>
            {['queued', 'running'].includes(selected.status) ? (
              <ActionButton variant="warn" loading={busy === 'cancel'} onClick={cancelTask}>取消任务</ActionButton>
            ) : null}
          </View>
        ) : (
          <EmptyState title="未选择任务" subtitle="点击上方任务记录查看详情。" />
        )}
      </Section>
    </PageShell>
  );
}
