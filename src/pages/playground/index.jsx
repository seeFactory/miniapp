import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, Image } from '../../h5-components';
import {
  api,
  assetTypeText,
  assetUrl,
  dateTime,
  modelName,
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
  SelectField,
  StatGrid,
  StatusPill,
  TextAreaField,
  TextField,
} from '../../ui';

const modes = [
  { value: 'chat', label: '文生文', nodeType: 'text_to_text', hint: '对话、润色、分镜文案', needsAsset: false },
  { value: 'multimodal_chat', label: '图生文', nodeType: 'image_to_text', hint: '读图、拆解画面、反推提示词', needsAsset: true },
  { value: 'text_to_image', label: '文生图', nodeType: 'text_to_image', hint: '海报、封面、短剧视觉', needsAsset: false },
  { value: 'text_to_video', label: '文生视频', nodeType: 'text_to_video', hint: '短剧分镜和视频任务', needsAsset: false },
  { value: 'image_to_video', label: '图生视频', nodeType: 'image_to_video', hint: '让图片形成视频片段', needsAsset: true },
];

const sizeOptions = [
  { label: '方图 1024x1024', value: '1024x1024' },
  { label: '竖屏 1080x1920', value: '1080x1920' },
  { label: '海报 1080x1440', value: '1080x1440' },
  { label: '横幅 1600x900', value: '1600x900' },
];

const paletteOptions = [
  { label: 'seeFactory 素色', value: 'sage' },
  { label: '新扁平柔光', value: 'flat' },
  { label: '黑白极简', value: 'mono' },
  { label: '新拟物', value: 'neumorphic' },
];

const ratioOptions = [
  { label: '9:16 竖屏', value: '9:16' },
  { label: '1:1 方形', value: '1:1' },
  { label: '16:9 横屏', value: '16:9' },
];

function parseSize(value) {
  const [width, height] = String(value).split('x').map((part) => Number(part));
  return { width: width || 1024, height: height || 1024 };
}

function modeText(value) {
  return modes.find((item) => item.value === value)?.label || value || '-';
}

function roleText(role) {
  if (role === 'assistant') return 'seeFactory';
  if (role === 'system') return '系统';
  return '我';
}

function messageAssets(message, assets) {
  const refs = Array.isArray(message.assetRefs) ? message.assetRefs : [];
  return refs
    .map((id) => assets.find((asset) => Number(asset.id) === Number(id)))
    .filter(Boolean);
}

export default function PlaygroundPage() {
  const [mode, setMode] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [assets, setAssets] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [form, setForm] = useState({
    prompt: '帮我生成一个适合 AI 短剧创意的开场方案。',
    systemPrompt: '',
    title: '操练场生成资产',
    palette: 'sage',
    size: '1024x1024',
    ratio: '9:16',
    duration: '6',
    motion: '轻微推进镜头，主体有自然动作。',
  });
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const currentMode = modes.find((item) => item.value === mode) || modes[0];
  const imageAssets = useMemo(
    () => assets.filter((asset) => ['image', 'poster', 'banner'].includes(asset.asset_type || asset.assetType)),
    [assets],
  );
  const modelsForMode = useMemo(
    () => models.filter((model) => model.schema?.nodeType === currentMode.nodeType),
    [models, currentMode.nodeType],
  );
  const currentSession = sessions.find((item) => String(item.id) === String(sessionId));

  const loadMessages = async (id) => {
    if (!id) return;
    const payload = await api(`/api/playground/sessions/${id}/messages${queryFrom({ page: 1, pageSize: 80 })}`);
    setMessages(normalizePage(payload, 80).items);
  };

  const loadAssets = async () => {
    const payload = await api(`/api/assets${queryFrom({ page: 1, pageSize: 80 })}`);
    setAssets(normalizePage(payload, 80).items);
  };

  const createSession = async (title = '') => {
    const created = await api('/api/playground/sessions', {
      method: 'POST',
      data: {
        title: title || `操练场 ${new Date().toLocaleDateString('zh-CN')}`,
        type: 'mixed',
      },
    });
    return created;
  };

  const load = async () => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const [sessionPayload, modelPayload, assetPayload] = await Promise.all([
        api(`/api/playground/sessions${queryFrom({ page: 1, pageSize: 20 })}`),
        api('/api/models/capabilities'),
        api(`/api/assets${queryFrom({ page: 1, pageSize: 80 })}`),
      ]);
      let sessionItems = normalizePage(sessionPayload, 20).items;
      if (!sessionItems.length) {
        const created = await createSession();
        sessionItems = [created];
      }
      setSessions(sessionItems);
      setModels(Array.isArray(modelPayload) ? modelPayload : []);
      setAssets(normalizePage(assetPayload, 80).items);
      const currentStillExists = sessionItems.some((item) => String(item.id) === String(sessionId));
      const nextSessionId = String(currentStillExists ? sessionId : sessionItems[0]?.id || '');
      setSessionId(nextSessionId);
      if (nextSessionId) await loadMessages(nextSessionId);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '操练场加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const firstModel = modelsForMode[0];
    if (!modelsForMode.some((model) => model.model_key === selectedModel)) {
      setSelectedModel(firstModel?.model_key || '');
    }
  }, [modelsForMode, selectedModel]);

  const patchForm = (values) => setForm((prev) => ({ ...prev, ...values }));

  const switchSession = async (id) => {
    setSessionId(String(id));
    setBusy(`session-${id}`);
    try {
      await loadMessages(id);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '会话消息加载失败。');
    } finally {
      setBusy('');
    }
  };

  const startSession = async () => {
    setBusy('new-session');
    try {
      const created = await createSession();
      setSessions((prev) => [created, ...prev]);
      setSessionId(String(created.id));
      setMessages([]);
      setTone('good');
      setMessage('已创建新的操练场会话。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '新建会话失败。');
    } finally {
      setBusy('');
    }
  };

  const removeSession = async () => {
    if (!sessionId) return;
    setBusy('delete-session');
    try {
      await api(`/api/playground/sessions/${sessionId}`, { method: 'DELETE' });
      const nextSessions = sessions.filter((item) => String(item.id) !== String(sessionId));
      if (nextSessions.length) {
        setSessions(nextSessions);
        setSessionId(String(nextSessions[0].id));
        await loadMessages(nextSessions[0].id);
      } else {
        const created = await createSession();
        setSessions([created]);
        setSessionId(String(created.id));
        setMessages([]);
      }
      setTone('good');
      setMessage('会话已删除。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '删除会话失败。');
    } finally {
      setBusy('');
    }
  };

  const run = async () => {
    if (!sessionId) {
      setTone('error');
      setMessage('请先创建一个操练场会话。');
      return;
    }
    if (currentMode.needsAsset && !selectedAssetId) {
      setTone('error');
      setMessage(`${currentMode.label} 需要先选择一张图片资产。`);
      return;
    }
    if (!form.prompt.trim()) {
      setTone('error');
      setMessage('请先输入本次操练的提示词。');
      return;
    }

    const size = parseSize(form.size);
    setBusy('run');
    try {
      const payload = await api(`/api/playground/sessions/${sessionId}/run`, {
        method: 'POST',
        data: {
          mode,
          capabilityKey: selectedModel || undefined,
          input: {
            text: form.prompt.trim(),
            prompt: form.prompt.trim(),
            assetId: selectedAssetId ? Number(selectedAssetId) : undefined,
            assetIds: selectedAssetId ? [Number(selectedAssetId)] : [],
          },
          params: {
            systemPrompt: form.systemPrompt.trim(),
            title: form.title.trim() || '操练场生成资产',
            palette: form.palette,
            width: size.width,
            height: size.height,
            ratio: form.ratio,
            duration: Number(form.duration || 6),
            motion: form.motion.trim(),
          },
        },
      });
      setTone('good');
      setMessage(`运行完成，消耗 ${money(payload.billing?.actualCostCents || payload.estimate?.totalCents || 0)}。`);
      await Promise.all([loadMessages(sessionId), loadAssets()]);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '运行失败，请检查余额、资产和模型状态。');
      await loadMessages(sessionId);
    } finally {
      setBusy('');
    }
  };

  const stopRuns = async () => {
    if (!sessionId) return;
    setBusy('stop');
    try {
      await api(`/api/playground/sessions/${sessionId}/stop`, { method: 'POST' });
      setTone('good');
      setMessage('已提交停止当前会话运行的请求。');
      await loadMessages(sessionId);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '停止运行失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <PageShell
      eyebrow="Playground"
      title="操练场"
      subtitle="像 new-api 操练场一样快速测试模型，但会话、资产和扣费都进入 seeFactory 平台账本。"
      message={message}
      tone={tone}
      onRefresh={load}
      actions={[
        { label: '新会话', primary: true, onClick: startSession },
        { label: '资产', onClick: () => navigateTo('/pages/assets/index') },
        { label: '记录', onClick: () => navigateTo('/pages/tasks/index') },
      ]}
    >
      <StatGrid
        items={[
          { label: '会话', value: sessions.length, hint: currentSession?.title || '自动保存', tone: 'dark' },
          { label: '消息', value: messages.length, hint: modeText(mode), tone: 'green' },
          { label: '可用模型', value: modelsForMode.length, hint: currentMode.nodeType, tone: 'yellow' },
          { label: '图片资产', value: imageAssets.length, hint: '图生文/图生视频可用', tone: 'blue' },
        ]}
      />

      <Section title="会话" subtitle="历史对话保存在服务端，可在多端继续使用。">
        <View className="sf-session-strip">
          {sessions.map((session) => (
            <Button
              key={session.id}
              className={`sf-session-card ${String(session.id) === String(sessionId) ? 'active' : ''}`}
              onClick={() => switchSession(session.id)}
            >
              <Text className="sf-session-title">{session.title}</Text>
              <Text className="sf-session-meta">
                {busy === `session-${session.id}` ? '加载中' : `${modeText(session.last_mode)} · ${dateTime(session.updated_at)}`}
              </Text>
            </Button>
          ))}
        </View>
      </Section>

      <Section title="能力模式" subtitle="基础节点类型直接映射平台模型能力。">
        <View className="sf-mode-grid">
          {modes.map((item) => (
            <Button
              key={item.value}
              className={`sf-mode-card ${mode === item.value ? 'active' : ''}`}
              onClick={() => setMode(item.value)}
            >
              <Text className="sf-mode-name">{item.label}</Text>
              <Text className="sf-mode-hint">{item.hint}</Text>
            </Button>
          ))}
        </View>
      </Section>

      <Section title="输入与模型" subtitle="移动端只暴露必要参数，复杂配置交给平台 Provider。">
        <View className="sf-form-panel">
          <SelectField
            label="模型能力"
            value={selectedModel}
            options={
              modelsForMode.length
                ? modelsForMode.map((model) => ({
                    label: `${modelName(model)} · ${money(model.price_cents)}`,
                    value: model.model_key,
                  }))
                : [{ label: '暂无可用模型', value: '' }]
            }
            onChange={setSelectedModel}
          />
          <TextAreaField
            label="提示词"
            value={form.prompt}
            placeholder="描述你要测试、生成或分析的内容"
            onChange={(value) => patchForm({ prompt: value })}
          />
          {mode === 'chat' || mode === 'multimodal_chat' ? (
            <TextAreaField
              label="系统要求"
              value={form.systemPrompt}
              placeholder="可选：限制风格、角色或输出格式"
              onChange={(value) => patchForm({ systemPrompt: value })}
            />
          ) : null}
          {mode === 'text_to_image' ? (
            <>
              <TextField
                label="资产标题"
                value={form.title}
                placeholder="输出图片资产名称"
                onChange={(value) => patchForm({ title: value })}
              />
              <SelectField label="图片尺寸" value={form.size} options={sizeOptions} onChange={(value) => patchForm({ size: value })} />
              <SelectField label="视觉风格" value={form.palette} options={paletteOptions} onChange={(value) => patchForm({ palette: value })} />
            </>
          ) : null}
          {mode === 'text_to_video' || mode === 'image_to_video' ? (
            <>
              <SelectField label="视频比例" value={form.ratio} options={ratioOptions} onChange={(value) => patchForm({ ratio: value })} />
              <TextField label="时长秒数" value={form.duration} type="number" placeholder="2-30" onChange={(value) => patchForm({ duration: value })} />
              <TextAreaField
                label="运动要求"
                value={form.motion}
                placeholder="镜头、主体动作、节奏或情绪变化"
                onChange={(value) => patchForm({ motion: value })}
              />
            </>
          ) : null}
          {currentMode.needsAsset ? (
            <SelectField
              label="图片资产"
              value={selectedAssetId}
              options={[
                { label: imageAssets.length ? '请选择图片资产' : '暂无图片资产', value: '' },
                ...imageAssets.map((asset) => ({ label: shortText(asset.title || asset.url, 18), value: String(asset.id) })),
              ]}
              onChange={setSelectedAssetId}
            />
          ) : null}
          <View className="sf-inline-actions">
            <ActionButton loading={busy === 'run'} disabled={!selectedModel} onClick={run}>运行</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'stop'} onClick={stopRuns}>停止</ActionButton>
            <ActionButton variant="secondary" loading={busy === 'delete-session'} onClick={removeSession}>删除会话</ActionButton>
          </View>
        </View>
      </Section>

      <Section title="消息流" subtitle={currentSession ? `当前：${currentSession.title}` : '运行后会在这里看到上下文。'}>
        {messages.length ? (
          <View className="sf-chat-stream">
            {messages.map((item) => {
              const refs = messageAssets(item, assets);
              return (
                <View className={`sf-chat-bubble ${item.role || 'user'}`} key={item.id}>
                  <View className="sf-chat-head">
                    <Text className="sf-chat-role">{roleText(item.role)}</Text>
                    <StatusPill status={item.status || 'succeeded'}>{statusText(item.status || 'succeeded')}</StatusPill>
                  </View>
                  <Text className="sf-chat-content">{item.content || '空消息'}</Text>
                  {refs.length ? (
                    <View className="sf-chat-assets">
                      {refs.map((asset) => {
                        const type = asset.asset_type || asset.assetType;
                        const preview = ['image', 'poster', 'banner'].includes(type);
                        return (
                          <View className="sf-chat-asset" key={asset.id}>
                            {preview ? (
                              <Image className="sf-chat-image" src={assetUrl(asset.url)} mode="aspectFill" />
                            ) : null}
                            <Text className="sf-chat-asset-title">{shortText(asset.title || asset.url, 24)}</Text>
                            <Text className="sf-chat-asset-meta">{assetTypeText(type)} · #{asset.id}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                  <View className="sf-record-foot">
                    <Text>{modeText(item.mode)}</Text>
                    <Text>{item.cost_cents ? money(item.cost_cents) : dateTime(item.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState title="还没有消息" subtitle="选择一个能力模式并运行，操练场会自动保存用户输入和模型回复。" />
        )}
      </Section>
    </PageShell>
  );
}
