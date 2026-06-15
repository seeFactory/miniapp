import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image } from '../../h5-components';
import {
  api,
  assetUrl,
  modelName,
  money,
  requireAuth,
  shortText,
  statusText,
} from '../../lib';
import {
  ActionButton,
  EmptyState,
  PageShell,
  Section,
  SelectField,
  StatGrid,
  StatusPill,
  TextAreaField,
  TextField,
} from '../../ui';

const paletteOptions = [
  { label: 'sage', value: 'sage' },
  { label: 'mono', value: 'mono' },
  { label: 'neumorphic', value: 'neumorphic' },
  { label: 'flat', value: 'flat' },
];

export default function ModelsPage() {
  const [models, setModels] = useState([]);
  const [modality, setModality] = useState('all');
  const [selectedKey, setSelectedKey] = useState('');
  const [prompt, setPrompt] = useState('为 seeFactory 生成一张极简、新扁平风格的宣传海报。');
  const [title, setTitle] = useState('seeFactory 创意工作流平台');
  const [palette, setPalette] = useState('sage');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async () => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const payload = await api('/api/models/capabilities');
      const list = Array.isArray(payload) ? payload : [];
      setModels(list);
      setSelectedKey((current) => current || list.find((item) => item.model_key === 'local-poster-renderer')?.model_key || list[0]?.model_key || '');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '模型能力加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleModels = useMemo(
    () => (modality === 'all' ? models : models.filter((item) => item.modality === modality)),
    [models, modality],
  );

  const selected = models.find((item) => item.model_key === selectedKey) || visibleModels[0];

  const runTest = async () => {
    if (!selected?.model_key) {
      setTone('error');
      setMessage('请先选择一个可用模型。');
      return;
    }
    if (!prompt.trim()) {
      setTone('error');
      setMessage('请输入测试提示词。');
      return;
    }
    setBusy('test');
    setResult(null);
    try {
      const payload = await api('/api/models/test', {
        method: 'POST',
        data: {
          modelKey: selected.model_key,
          prompt,
          title,
          palette,
        },
      });
      setResult(payload);
      setTone('good');
      setMessage(`模型测试完成，消耗 ${money(payload.costCents || payload.cost_cents || selected.price_cents)}。`);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '当前模型没有真实运行器或测试失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <PageShell
      eyebrow="Model Lab"
      title="模型测试台"
      subtitle="在移动端直接测试平台提供的模型能力，并把输出写入资产链路。"
      message={message}
      tone={tone}
      onRefresh={load}
    >
      <StatGrid
        items={[
          { label: '在线模型', value: models.length, hint: '平台统一提供', tone: 'dark' },
          { label: '当前模型', value: selected ? modelName(selected) : '-', hint: selected?.model_key || '未选择', tone: 'green' },
          { label: '单次费用', value: selected ? money(selected.price_cents) : '-', hint: '按调用计费', tone: 'yellow' },
          { label: '延迟', value: selected?.latency_ms ? `${selected.latency_ms}ms` : '-', hint: selected?.provider || 'provider', tone: 'blue' },
        ]}
      />

      <Section title="模型列表" subtitle="先选择能力，再在下方发起真实测试。">
        <View className="sf-toolbar">
          <SelectField
            value={modality}
            options={[
              { label: '全部类型', value: 'all' },
              { label: '图片', value: 'image' },
              { label: '视频', value: 'video' },
              { label: '文本', value: 'text' },
            ]}
            onChange={setModality}
          />
        </View>
        {visibleModels.length ? (
          visibleModels.map((model) => (
            <View className="sf-record" key={model.model_key} onClick={() => setSelectedKey(model.model_key)}>
              <View className="sf-record-head">
                <View className="sf-record-main">
                  <Text className="sf-record-title">{modelName(model)}</Text>
                  <Text className="sf-record-sub">{shortText(model.description || model.model_key)}</Text>
                </View>
                <StatusPill status={model.status || 'active'}>{statusText(model.status || 'active')}</StatusPill>
              </View>
              <View className="sf-record-foot">
                <Text>{model.modality || 'multi'} · {model.provider || 'local'}</Text>
                <Text>{money(model.price_cents)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="没有匹配模型" subtitle="切换类型或稍后让平台管理员接入模型。" />
        )}
      </Section>

      <Section title="测试参数" subtitle="当前真实运行器主要覆盖本地海报模型；其他模型会给出后端限制提示。">
        <View className="sf-form-panel">
          <TextField label="标题" value={title} placeholder="输出资产标题" onChange={setTitle} />
          <TextAreaField label="提示词" value={prompt} placeholder="描述要生成的内容" onChange={setPrompt} />
          <SelectField label="调色方案" value={palette} options={paletteOptions} onChange={setPalette} />
          <ActionButton loading={busy === 'test'} onClick={runTest}>运行模型测试</ActionButton>
        </View>
      </Section>

      <Section title="测试结果">
        {result ? (
          <View className="sf-form-panel">
            <View className="sf-record-head">
              <View className="sf-record-main">
                <Text className="sf-record-title">{result.asset?.title || title}</Text>
                <Text className="sf-record-sub">状态：{statusText(result.status)} · 消耗 {money(result.costCents || result.cost_cents)}</Text>
              </View>
              <StatusPill status={result.status}>{statusText(result.status)}</StatusPill>
            </View>
            {result.asset?.url ? (
              <View className="sf-image-preview">
                <Image className="sf-preview-image" src={assetUrl(result.asset.url)} mode="aspectFill" />
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState title="暂无测试结果" subtitle="运行一次模型测试后，输出会显示在这里。" />
        )}
      </Section>
    </PageShell>
  );
}
