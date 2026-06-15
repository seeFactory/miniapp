import React, { useEffect, useState } from 'react';
import { View, Text } from '../../h5-components';
import {
  api,
  dateTime,
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
  EmptyState,
  PageShell,
  Section,
  StatGrid,
  StatusPill,
  WorkflowMini,
} from '../../ui';

const emptySummary = {
  balanceCents: 0,
  tasks: { total: 0, succeeded: 0, failed: 0, costCents: 0 },
  workflows: { total: 0, published: 0 },
  assets: { total: 0 },
  orders: { total: 0, pending: 0, paid: 0, paidAmountCents: 0 },
  ledgers: { incomeCents: 0, expenseCents: 0 },
  recentTasks: [],
  recentOrders: [],
};

export default function HomePage() {
  const [summary, setSummary] = useState(emptySummary);
  const [workflows, setWorkflows] = useState([]);
  const [workshop, setWorkshop] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');

  const load = async () => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const [me, nextSummary, workflowPayload, workshopPayload, taskPayload] = await Promise.all([
        api('/api/users/me'),
        api('/api/users/me/summary'),
        api(`/api/workflows${queryFrom({ page: 1, pageSize: 3 })}`),
        api(`/api/workshop/items${queryFrom({ page: 1, pageSize: 3 })}`),
        api(`/api/tasks${queryFrom({ page: 1, pageSize: 4 })}`),
      ]);
      setUser(me);
      setSummary({ ...emptySummary, ...nextSummary });
      setWorkflows(normalizePage(workflowPayload, 3).items);
      setWorkshop(normalizePage(workshopPayload, 3).items);
      setTasks(normalizePage(taskPayload, 4).items);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '控制台加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell
      eyebrow={user?.displayName ? `你好，${user.displayName}` : 'Workspace'}
      title="生产控制台"
      subtitle="在手机上查看余额、任务、工作流和创意工坊，不必切回桌面端。"
      message={message}
      tone={tone}
      onRefresh={load}
      actions={[
        { label: '新建工作流', primary: true, onClick: () => navigateTo('/pages/workflows/index') },
        { label: '模型测试', onClick: () => navigateTo('/pages/models/index') },
        { label: '充值', onClick: () => navigateTo('/pages/wallet/index') },
      ]}
    >
      <StatGrid
        items={[
          { label: '可用余额', value: money(summary.balanceCents), hint: '模型调度余额', tone: 'dark' },
          { label: '工作流', value: summary.workflows.total, hint: `${summary.workflows.published} 个已发布`, tone: 'green' },
          { label: '任务', value: summary.tasks.total, hint: `${summary.tasks.succeeded} 成功 / ${summary.tasks.failed} 失败`, tone: 'blue' },
          { label: '资产', value: summary.assets.total, hint: `累计消耗 ${money(summary.tasks.costCents)}`, tone: 'yellow' },
        ]}
      />

      <Section
        title="快捷入口"
        subtitle="移动端保留 Dashboard 的完整核心职能。"
      >
        <View className="sf-panel">
          <View className="sf-inline-actions">
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/workflows/index')}>工作流</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/workshop/index')}>创意工坊</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/tasks/index')}>调用记录</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/assets/index')}>资产库</ActionButton>
          </View>
        </View>
      </Section>

      <Section
        title="最近工作流"
        action={{ label: '查看全部', onClick: () => navigateTo('/pages/workflows/index') }}
      >
        {workflows.length ? (
          workflows.map((workflow) => (
            <WorkflowMini
              key={workflow.id}
              workflow={workflow}
              onClick={() => navigateTo('/pages/workflows/index')}
            />
          ))
        ) : (
          <EmptyState title="还没有工作流" subtitle="从移动端也可以直接创建可导出的 no-code 链路。" />
        )}
      </Section>

      <Section
        title="最近任务"
        action={{ label: '调用记录', onClick: () => navigateTo('/pages/tasks/index') }}
      >
        {tasks.length ? (
          tasks.map((task) => (
            <View className="sf-record" key={task.id}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">
                    {task.workflow_title || task.workshop_title || `任务 #${task.id}`}
                  </Text>
                  <Text className="sf-record-sub">{shortText(task.error_message || '模型调用链路已记录。')}</Text>
                </View>
                <StatusPill status={task.status}>{statusText(task.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{money(task.cost_cents)}</Text>
                <Text>{dateTime(task.created_at)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="暂无调用记录" subtitle="运行工作流或工坊样例后会生成任务。"/>
        )}
      </Section>

      <Section title="创意工坊精选">
        {workshop.length ? (
          workshop.map((item) => (
            <View className="sf-record" key={item.id} onClick={() => navigateTo('/pages/workshop/index')}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{item.title}</Text>
                  <Text className="sf-record-sub">{shortText(item.summary || '可直接运行或克隆为自己的工作流。')}</Text>
                </View>
                <StatusPill status={item.license_mode === 'open' ? 'published' : 'draft'}>
                  {item.license_mode === 'open' ? '开源' : '闭源'}
                </StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{item.author_name || '创作者'}</Text>
                <Text>运行 {item.run_count || 0}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="工坊暂时为空" subtitle="发布工作流后，它会出现在这里供用户运行。"/>
        )}
      </Section>
    </PageShell>
  );
}
