import React from 'react';
import { View, Text, Button, Input, Textarea, Picker, Image } from './h5-components';
import Taro from '@tarojs/taro';
import {
  componentMeta,
  dateTime,
  graphSummary,
  money,
  statusClass,
  statusText,
  workflowSteps,
} from './lib';

export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
  message,
  tone = 'info',
  actions = [],
  onRefresh,
}) {
  return (
    <View className="sf-page">
      <View className="sf-topbar">
        <View className="sf-brand">
          <Image className="sf-brand-logo" src="/brand/logo-icon.png" mode="aspectFit" />
          <View className="sf-brand-copy">
            <Text className="sf-brand-name">seeFactory</Text>
            <Text className="sf-brand-sub">移动工作台</Text>
          </View>
        </View>
        {onRefresh ? (
          <Button className="sf-icon-button" onClick={onRefresh}>
            同步
          </Button>
        ) : null}
      </View>

      <View className="sf-heading">
        {eyebrow ? <Text className="sf-eyebrow">{eyebrow}</Text> : null}
        <Text className="sf-title">{title}</Text>
        {subtitle ? <Text className="sf-subtitle">{subtitle}</Text> : null}
      </View>

      {actions.length ? (
        <View className="sf-action-strip">
          {actions.map((action) => (
            <Button
              key={action.label}
              className={`sf-chip-action ${action.primary ? 'primary' : ''}`}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}

      {message ? <Notice tone={tone}>{message}</Notice> : null}
      {children}
    </View>
  );
}

export function Notice({ tone = 'info', children }) {
  return (
    <View className={`sf-notice ${tone}`}>
      <Text>{children}</Text>
    </View>
  );
}

export function Section({ title, subtitle, action, children }) {
  return (
    <View className="sf-section">
      <View className="sf-section-head">
        <View className="sf-section-copy">
          <Text className="sf-section-title">{title}</Text>
          {subtitle ? <Text className="sf-section-subtitle">{subtitle}</Text> : null}
        </View>
        {action ? (
          <Button className="sf-text-button" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function StatGrid({ items = [] }) {
  return (
    <View className="sf-stat-grid">
      {items.map((item) => (
        <View className={`sf-stat ${item.tone || ''}`} key={item.label}>
          <Text className="sf-stat-label">{item.label}</Text>
          <Text className="sf-stat-value">{item.value}</Text>
          {item.hint ? <Text className="sf-stat-hint">{item.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function Toolbar({ children }) {
  return <View className="sf-toolbar">{children}</View>;
}

export function ActionButton({ children, onClick, disabled, loading, variant = 'primary' }) {
  return (
    <Button
      className={`sf-button ${variant}`}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      {children}
    </Button>
  );
}

export function TextButton({ children, onClick, disabled }) {
  return (
    <Button className="sf-link-button" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

export function TextField({ label, value, onChange, placeholder, type = 'text', password = false }) {
  return (
    <View className="sf-field">
      {label ? <Text className="sf-field-label">{label}</Text> : null}
      <Input
        className="sf-input"
        value={value}
        type={type}
        password={password}
        placeholder={placeholder}
        onInput={(event) => onChange?.(event.detail.value)}
      />
    </View>
  );
}

export function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <View className="sf-field">
      {label ? <Text className="sf-field-label">{label}</Text> : null}
      <Textarea
        className="sf-textarea"
        value={value}
        placeholder={placeholder}
        maxlength={1000}
        onInput={(event) => onChange?.(event.detail.value)}
      />
    </View>
  );
}

export function SelectField({ label, value, options = [], onChange }) {
  const index = Math.max(0, options.findIndex((item) => item.value === value));
  const current = options[index] || options[0] || {};

  return (
    <View className="sf-field">
      {label ? <Text className="sf-field-label">{label}</Text> : null}
      <Picker
        mode="selector"
        range={options.map((item) => item.label)}
        value={index}
        onChange={(event) => onChange?.(options[Number(event.detail.value)]?.value)}
      >
        <View className="sf-select">
          <Text>{current.label || '请选择'}</Text>
          <Text className="sf-select-arrow">↓</Text>
        </View>
      </Picker>
    </View>
  );
}

export function Segmented({ value, options = [], onChange }) {
  return (
    <View className="sf-segmented">
      {options.map((item) => (
        <Button
          key={item.value}
          className={`sf-segment ${value === item.value ? 'active' : ''}`}
          onClick={() => onChange?.(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </View>
  );
}

export function StatusPill({ status, children }) {
  return <Text className={`sf-pill ${statusClass(status)}`}>{children || statusText(status)}</Text>;
}

export function EmptyState({ title = '暂无数据', subtitle = '调整筛选条件或新建内容后会显示在这里。' }) {
  return (
    <View className="sf-empty">
      <Text className="sf-empty-mark">∅</Text>
      <Text className="sf-empty-title">{title}</Text>
      <Text className="sf-empty-subtitle">{subtitle}</Text>
    </View>
  );
}

export function Pager({ page, totalPages, total, onChange }) {
  if (!page || !totalPages || totalPages <= 1) return null;
  return (
    <View className="sf-pager">
      <Button className="sf-page-button" disabled={page <= 1} onClick={() => onChange?.(page - 1)}>
        上一页
      </Button>
      <Text className="sf-page-indicator">
        {page}/{totalPages} · {total || 0} 条
      </Text>
      <Button
        className="sf-page-button"
        disabled={page >= totalPages}
        onClick={() => onChange?.(page + 1)}
      >
        下一页
      </Button>
    </View>
  );
}

export function WorkflowChain({ graph, compact = false }) {
  const steps = workflowSteps(graph);
  if (!steps.length) {
    return <EmptyState title="链路为空" subtitle="添加输入、模型与输出组件后即可运行。" />;
  }

  return (
    <View className={`sf-chain ${compact ? 'compact' : ''}`}>
      {steps.map((step, index) => (
        <View className="sf-chain-row" key={step.id}>
          <View className="sf-chain-rail">
            <Text className={`sf-chain-dot ${step.tone}`}>{index + 1}</Text>
            {index < steps.length - 1 ? <View className="sf-chain-line" /> : null}
          </View>
          <View className="sf-chain-body">
            <View className="sf-chain-meta">
              <Text className="sf-chain-category">{step.category}</Text>
              <Text className="sf-chain-component">{step.component}</Text>
            </View>
            <Text className="sf-chain-title">{step.label}</Text>
            {!compact && step.description ? <Text className="sf-chain-desc">{step.description}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function WorkflowMini({ workflow, onClick }) {
  return (
    <View className="sf-record" onClick={onClick}>
      <View className="sf-record-head">
        <View className="sf-record-main">
          <Text className="sf-record-title">{workflow.title || '未命名 Workflow'}</Text>
          <Text className="sf-record-sub">{graphSummary(workflow.graph)}</Text>
        </View>
        <StatusPill status={workflow.status} />
      </View>
      <View className="sf-record-foot">
        <Text>版本 v{workflow.latest_version || workflow.version || 1}</Text>
        <Text>{dateTime(workflow.updated_at || workflow.created_at)}</Text>
      </View>
    </View>
  );
}

export function MoneyLine({ label, value, hint }) {
  return (
    <View className="sf-money-line">
      <Text className="sf-money-label">{label}</Text>
      <View>
        <Text className="sf-money-value">{money(value)}</Text>
        {hint ? <Text className="sf-money-hint">{hint}</Text> : null}
      </View>
    </View>
  );
}

export function ComponentChip({ component }) {
  const key = component.component_key || component.key || component.component;
  const meta = componentMeta(key, component);
  return (
    <View className={`sf-component-chip ${meta.tone}`}>
      <Text className="sf-component-name">{meta.label}</Text>
      <Text className="sf-component-kind">{meta.category}</Text>
    </View>
  );
}

export function copyText(data, title = '已复制') {
  Taro.setClipboardData({
    data: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    success: () => Taro.showToast({ title, icon: 'none' }),
  });
}
