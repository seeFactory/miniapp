import React, { useEffect, useState } from 'react';
import { View, Text } from '../../h5-components';
import {
  api,
  dateTime,
  directionText,
  money,
  normalizePage,
  queryFrom,
  reasonText,
  requireAuth,
  statusText,
} from '../../lib';
import {
  ActionButton,
  EmptyState,
  MoneyLine,
  PageShell,
  Pager,
  Section,
  SelectField,
  StatGrid,
  StatusPill,
  TextField,
} from '../../ui';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState(null);
  const [ledgerFilters, setLedgerFilters] = useState({ page: 1, pageSize: 6, q: '', direction: 'all' });
  const [orderFilters, setOrderFilters] = useState({ page: 1, pageSize: 6, q: '', status: 'all' });
  const [withdrawFilters, setWithdrawFilters] = useState({ page: 1, pageSize: 6, status: 'all' });
  const [ledgers, setLedgers] = useState(normalizePage([], 6));
  const [orders, setOrders] = useState(normalizePage([], 6));
  const [withdraws, setWithdraws] = useState(normalizePage([], 6));
  const [amount, setAmount] = useState('100');
  const [rechargeChannel, setRechargeChannel] = useState('wechat');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async (nextLedgerFilters = ledgerFilters, nextOrderFilters = orderFilters, nextWithdrawFilters = withdrawFilters) => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const [balancePayload, nextSummary, ledgerPayload, orderPayload, withdrawPayload] = await Promise.all([
        api('/api/wallet/balance'),
        api('/api/users/me/summary'),
        api(`/api/wallet/ledgers${queryFrom(nextLedgerFilters)}`),
        api(`/api/payments/recharge-orders${queryFrom(nextOrderFilters)}`),
        api(`/api/withdraw-orders${queryFrom(nextWithdrawFilters)}`),
      ]);
      setBalance(balancePayload.balanceCents || 0);
      setSummary(nextSummary);
      setLedgers(normalizePage(ledgerPayload, nextLedgerFilters.pageSize));
      setOrders(normalizePage(orderPayload, nextOrderFilters.pageSize));
      setWithdraws(normalizePage(withdrawPayload, nextWithdrawFilters.pageSize));
    } catch (error) {
      setTone('error');
      setMessage(error.message || '钱包数据加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createOrder = async () => {
    const cents = Math.round(Number(amount || 0) * 100);
    if (!cents || cents < 1) {
      setTone('error');
      setMessage('充值金额需大于 0 元，最小单位为 0.01 元。');
      return;
    }
    setBusy('recharge');
    try {
      const order = await api('/api/payments/recharge-orders', {
        method: 'POST',
        data: { amountCents: cents, channel: rechargeChannel },
      });
      setTone('good');
      setMessage(`已创建 ${order.channel} 充值订单 ${order.externalNo || `#${order.id}`}，等待管理员确认收款。`);
      await load(ledgerFilters, { ...orderFilters, page: 1 }, withdrawFilters);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '充值订单创建失败。');
    } finally {
      setBusy('');
    }
  };

  const updateLedgerFilters = (values) => {
    const next = { ...ledgerFilters, ...values };
    setLedgerFilters(next);
    load(next, orderFilters, withdrawFilters);
  };

  const updateOrderFilters = (values) => {
    const next = { ...orderFilters, ...values };
    setOrderFilters(next);
    load(ledgerFilters, next, withdrawFilters);
  };

  const updateWithdrawFilters = (values) => {
    const next = { ...withdrawFilters, ...values };
    setWithdrawFilters(next);
    load(ledgerFilters, orderFilters, next);
  };

  return (
    <PageShell
      eyebrow="账单"
      title="钱包与账单"
      subtitle="查看余额、充值订单和模型调用扣费流水。"
      message={message}
      tone={tone}
      onRefresh={() => load()}
    >
      <StatGrid
        items={[
          { label: '可用余额', value: money(balance), hint: '充值确认后入账', tone: 'dark' },
          { label: '累计充值', value: money(summary?.ledgers?.incomeCents || 0), hint: `${summary?.orders?.paid || 0} 笔已支付`, tone: 'green' },
          { label: '模型扣费', value: money(summary?.ledgers?.expenseCents || 0), hint: `${summary?.tasks?.total || 0} 次任务`, tone: 'yellow' },
          { label: '待支付', value: summary?.orders?.pending || 0, hint: '充值订单', tone: 'blue' },
        ]}
      />

      <Section title="充值">
        <View className="sf-form-panel">
          <View className="sf-inline-actions sf-amount-grid">
            {['50', '100', '500', '1000'].map((value) => (
              <ActionButton key={value} variant={amount === value ? 'primary' : 'secondary'} onClick={() => setAmount(value)}>
                {value} 元
              </ActionButton>
            ))}
          </View>
          <View className="sf-form-spacer" />
          <SelectField
            label="充值渠道"
            value={rechargeChannel}
            options={[
              { label: '微信支付', value: 'wechat' },
              { label: '支付宝', value: 'alipay' },
              { label: '手动登记', value: 'manual' },
            ]}
            onChange={setRechargeChannel}
          />
          <View className="sf-form-spacer" />
          <TextField label="自定义金额" value={amount} type="number" placeholder="输入充值金额" onChange={setAmount} />
          <ActionButton loading={busy === 'recharge'} onClick={createOrder}>创建充值订单</ActionButton>
        </View>
      </Section>

      <Section title="钱包流水" subtitle="支持分页和收入/支出筛选。">
        <View className="sf-toolbar">
          <TextField value={ledgerFilters.q} placeholder="搜索流水原因或编号" onChange={(value) => setLedgerFilters((prev) => ({ ...prev, q: value }))} />
          <SelectField
            value={ledgerFilters.direction}
            options={[
              { label: '全部方向', value: 'all' },
              { label: '入账', value: 'income' },
              { label: '扣费', value: 'expense' },
            ]}
            onChange={(value) => updateLedgerFilters({ direction: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => updateLedgerFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => updateLedgerFilters({ q: '', direction: 'all', page: 1 })}>重置</ActionButton>
        </View>
        <View className="sf-form-spacer" />
        {ledgers.items.length ? (
          <View className="sf-panel">
            {ledgers.items.map((item) => (
              <MoneyLine
                key={item.id}
                label={`${directionText(Number(item.amount_cents) >= 0 ? 'credit' : 'debit')} · ${reasonText(item.reason)}`}
                value={item.amount_cents}
                hint={dateTime(item.created_at)}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="暂无流水" subtitle="充值或模型调用后会产生钱包流水。" />
        )}
        <Pager page={ledgers.page} totalPages={ledgers.totalPages} total={ledgers.total} onChange={(nextPage) => updateLedgerFilters({ page: nextPage })} />
      </Section>

      <Section title="充值订单" subtitle="充值订单需要支付回调或平台确认后入账。">
        <View className="sf-toolbar">
          <TextField value={orderFilters.q} placeholder="搜索订单号或渠道" onChange={(value) => setOrderFilters((prev) => ({ ...prev, q: value }))} />
          <SelectField
            value={orderFilters.status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '待支付', value: 'pending' },
              { label: '已支付', value: 'paid' },
            ]}
            onChange={(value) => updateOrderFilters({ status: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => updateOrderFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => updateOrderFilters({ q: '', status: 'all', page: 1 })}>重置</ActionButton>
        </View>
        <View className="sf-form-spacer" />
        {orders.items.length ? (
          orders.items.map((order) => (
            <View className="sf-record" key={order.id}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{money(order.amount_cents)}</Text>
                  <Text className="sf-record-sub">{order.external_no || order.externalNo || `订单 #${order.id}`}</Text>
                </View>
                <StatusPill status={order.status}>{statusText(order.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{order.channel || 'manual'} · {order.purpose || 'balance_recharge'}</Text>
                <Text>{dateTime(order.created_at)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="暂无订单" subtitle="创建充值订单后会显示在这里。" />
        )}
        <Pager page={orders.page} totalPages={orders.totalPages} total={orders.total} onChange={(nextPage) => updateOrderFilters({ page: nextPage })} />
      </Section>

      <Section title="提现申请" subtitle="查看提现冻结、审核、打款和驳回状态。">
        <View className="sf-toolbar">
          <SelectField
            value={withdrawFilters.status}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '待审核', value: 'pending' },
              { label: '已通过', value: 'approved' },
              { label: '已打款', value: 'paid' },
              { label: '已驳回', value: 'rejected' },
              { label: '已取消', value: 'cancelled' },
            ]}
            onChange={(value) => updateWithdrawFilters({ status: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => updateWithdrawFilters({ page: 1 })}>刷新</ActionButton>
          <ActionButton variant="secondary" onClick={() => updateWithdrawFilters({ status: 'all', page: 1 })}>重置</ActionButton>
        </View>
        <View className="sf-form-spacer" />
        {withdraws.items.length ? (
          withdraws.items.map((order) => (
            <View className="sf-record" key={order.id}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{money(order.amount_cents)}</Text>
                  <Text className="sf-record-sub">{order.channel} / {order.account_no_masked || `提现 #${order.id}`}</Text>
                </View>
                <StatusPill status={order.status}>{statusText(order.status)}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>到账 {money(order.arrival_cents)}</Text>
                <Text>{dateTime(order.created_at)}</Text>
              </View>
              {order.reject_reason ? <Text className="sf-error-text">{order.reject_reason}</Text> : null}
            </View>
          ))
        ) : (
          <EmptyState title="暂无提现申请" subtitle="在我的账号页提交提现后会显示在这里。" />
        )}
        <Pager page={withdraws.page} totalPages={withdraws.totalPages} total={withdraws.total} onChange={(nextPage) => updateWithdrawFilters({ page: nextPage })} />
      </Section>
    </PageShell>
  );
}
