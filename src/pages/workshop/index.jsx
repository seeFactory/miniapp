import React, { useEffect, useState } from 'react';
import { View, Text } from '../../h5-components';
import Taro from '@tarojs/taro';
import {
  api,
  dateTime,
  getToken,
  graphSummary,
  licenseText,
  money,
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
  const [filters, setFilters] = useState({ page: 1, pageSize: 6, q: '', licenseMode: 'all', sort: 'popular' });
  const [page, setPage] = useState(normalizePage([], 6));
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState(normalizePage([], 6));
  const [estimate, setEstimate] = useState(null);
  const [runPrompt, setRunPrompt] = useState('');
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [report, setReport] = useState({ reason: '内容违规', detail: '' });
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async (nextFilters = filters) => {
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
      const [detail, commentPayload, cost] = await Promise.all([
        api(`/api/workshop/items/${item.id}`),
        api(`/api/workshop/items/${item.id}/comments?page=1&pageSize=6`),
        getToken() ? api(`/api/workshop/items/${item.id}/estimate`).catch(() => null) : Promise.resolve(null),
      ]);
      setSelected(detail);
      setComments(normalizePage(commentPayload, 6));
      setEstimate(cost);
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
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
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

  const favoriteItem = async (item = selected) => {
    if (!requireAuth() || !item?.id) return;
    setBusy(`favorite-${item.id}`);
    try {
      await api(`/api/workshop/items/${item.id}/favorite`, { method: 'POST' });
      setTone('good');
      setMessage('已收藏该样例。');
      await openItem(item);
      await load(filters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '收藏失败。');
    } finally {
      setBusy('');
    }
  };

  const rateItem = async (item = selected) => {
    if (!requireAuth() || !item?.id) return;
    setBusy(`rate-${item.id}`);
    try {
      await api(`/api/workshop/items/${item.id}/rating`, { method: 'POST', data: { rating: Number(rating) } });
      setTone('good');
      setMessage('评分已提交。');
      await openItem(item);
      await load(filters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '评分失败。');
    } finally {
      setBusy('');
    }
  };

  const commentItem = async (item = selected) => {
    if (!requireAuth() || !item?.id || !commentText.trim()) return;
    setBusy(`comment-${item.id}`);
    try {
      await api(`/api/workshop/items/${item.id}/comments`, { method: 'POST', data: { content: commentText.trim() } });
      setCommentText('');
      setTone('good');
      setMessage('评论已发布。');
      await openItem(item);
      await load(filters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '评论失败。');
    } finally {
      setBusy('');
    }
  };

  const reportItem = async (item = selected) => {
    if (!requireAuth() || !item?.id) return;
    setBusy(`report-${item.id}`);
    try {
      await api(`/api/workshop/items/${item.id}/report`, { method: 'POST', data: report });
      setReport({ reason: '内容违规', detail: '' });
      setTone('good');
      setMessage('举报已提交，等待管理员审核。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '举报失败。');
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
          <SelectField
            value={filters.sort}
            options={[
              { label: '热门', value: 'popular' },
              { label: '最新', value: 'latest' },
              { label: '收入', value: 'income' },
              { label: '评分', value: 'rating' },
            ]}
            onChange={(value) => applyFilters({ sort: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyFilters({ q: '', licenseMode: 'all', sort: 'popular', page: 1 })}>重置</ActionButton>
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
                <Text>{item.author_name || '创作者'} · {money(item.price_cents || 0)}</Text>
                <Text>{busy === `open-${item.id}` ? '加载中' : `评分 ${Number(item.avg_rating || 0).toFixed(1)}`}</Text>
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
            <View className="sf-record-foot">
              <Text>预估 {estimate ? money(estimate.estimatedCostCents) : money(selected.price_cents || 0)}</Text>
              <Text>收藏 {selected.favorite_count || 0} · 评论 {selected.comment_count || 0}</Text>
            </View>
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
              <ActionButton variant="secondary" loading={busy === `favorite-${selected.id}`} onClick={() => favoriteItem(selected)}>收藏</ActionButton>
            </View>
            <View className="sf-form-spacer" />
            <SelectField
              label="评分"
              value={rating}
              options={[5, 4, 3, 2, 1].map((value) => ({ label: `${value} 星`, value }))}
              onChange={setRating}
            />
            <ActionButton variant="secondary" loading={busy === `rate-${selected.id}`} onClick={() => rateItem(selected)}>提交评分</ActionButton>
            <TextAreaField
              label="评论"
              value={commentText}
              placeholder="写下这个 workflow 适合的使用场景"
              onChange={setCommentText}
            />
            <ActionButton variant="secondary" loading={busy === `comment-${selected.id}`} onClick={() => commentItem(selected)}>发布评论</ActionButton>
            <View className="sf-event-list">
              {comments.items.length ? (
                comments.items.map((comment) => (
                  <View className="sf-event" key={comment.id}>
                    <Text className="sf-event-title">{comment.user_name || '用户'}</Text>
                    <Text className="sf-event-time">{comment.content}</Text>
                  </View>
                ))
              ) : (
                <EmptyState title="暂无评论" subtitle="运行体验或改造建议可以写在这里。" />
              )}
            </View>
            <TextField label="举报原因" value={report.reason} placeholder="内容违规" onChange={(value) => setReport((prev) => ({ ...prev, reason: value }))} />
            <TextAreaField label="举报详情" value={report.detail} placeholder="描述具体问题" onChange={(value) => setReport((prev) => ({ ...prev, detail: value }))} />
            <ActionButton variant="warn" loading={busy === `report-${selected.id}`} onClick={() => reportItem(selected)}>举报</ActionButton>
          </View>
        ) : (
          <EmptyState title="未选择样例" subtitle="点击上方任意工坊作品查看详情。" />
        )}
      </Section>
    </PageShell>
  );
}
