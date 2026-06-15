import React, { useEffect, useState } from 'react';
import { View, Text, Image } from '../../h5-components';
import {
  api,
  assetTypeText,
  assetUrl,
  dateTime,
  normalizePage,
  queryFrom,
  requireAuth,
  shortText,
} from '../../lib';
import {
  ActionButton,
  copyText,
  EmptyState,
  PageShell,
  Pager,
  Section,
  SelectField,
  StatusPill,
  TextField,
} from '../../ui';

export default function AssetsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 8, q: '', assetType: 'all' });
  const [page, setPage] = useState(normalizePage([], 8));
  const [form, setForm] = useState({ title: '', url: '', assetType: 'image' });
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async (nextFilters = filters) => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const payload = await api(`/api/assets${queryFrom(nextFilters)}`);
      setPage(normalizePage(payload, nextFilters.pageSize));
    } catch (error) {
      setTone('error');
      setMessage(error.message || '资产库加载失败。');
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

  const saveAsset = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setTone('error');
      setMessage('请填写资产标题和外链 URL。');
      return;
    }
    setBusy('upload');
    try {
      await api('/api/assets/upload', {
        method: 'POST',
        data: {
          title: form.title.trim(),
          assetType: form.assetType,
          url: form.url.trim(),
          metadata: { source: 'mobile-h5' },
        },
      });
      setForm({ title: '', url: '', assetType: 'image' });
      setTone('good');
      setMessage('外部资产已登记到资产库。');
      await load({ ...filters, page: 1 });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '资产登记失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <PageShell
      eyebrow="Assets"
      title="资产库"
      subtitle="查看模型输出、登记外部素材，并把图片、视频、文件纳入工作流。"
      message={message}
      tone={tone}
      onRefresh={() => load(filters)}
    >
      <Section title="登记外部资产" subtitle="H5 先支持 URL 登记；小程序可继续接入本地文件上传。">
        <View className="sf-form-panel">
          <TextField label="资产标题" value={form.title} placeholder="例如：品牌参考图" onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
          <TextField label="资产 URL" value={form.url} placeholder="https://..." onChange={(value) => setForm((prev) => ({ ...prev, url: value }))} />
          <SelectField
            label="资产类型"
            value={form.assetType}
            options={[
              { label: '图片', value: 'image' },
              { label: '视频', value: 'video' },
              { label: '文件', value: 'file' },
              { label: '海报', value: 'poster' },
              { label: 'Banner', value: 'banner' },
            ]}
            onChange={(value) => setForm((prev) => ({ ...prev, assetType: value }))}
          />
          <ActionButton loading={busy === 'upload'} onClick={saveAsset}>登记资产</ActionButton>
        </View>
      </Section>

      <Section title="筛选资产">
        <View className="sf-toolbar">
          <TextField value={filters.q} placeholder="搜索标题、类型或 URL" onChange={(value) => setFilters((prev) => ({ ...prev, q: value }))} />
          <SelectField
            value={filters.assetType}
            options={[
              { label: '全部类型', value: 'all' },
              { label: '图片', value: 'image' },
              { label: '视频', value: 'video' },
              { label: '文件', value: 'file' },
              { label: '海报', value: 'poster' },
              { label: 'Banner', value: 'banner' },
            ]}
            onChange={(value) => applyFilters({ assetType: value, page: 1 })}
          />
        </View>
        <View className="sf-inline-actions">
          <ActionButton variant="secondary" onClick={() => applyFilters({ page: 1 })}>搜索</ActionButton>
          <ActionButton variant="secondary" onClick={() => applyFilters({ q: '', assetType: 'all', page: 1 })}>重置</ActionButton>
        </View>
      </Section>

      <Section title="资产列表">
        {page.items.length ? (
          page.items.map((asset) => {
            const preview = ['image', 'poster', 'banner'].includes(asset.asset_type || asset.assetType);
            return (
              <View className="sf-record" key={asset.id}>
                <View className="sf-record-head">
                  <View className="sf-record-main">
                    <Text className="sf-record-title">{asset.title}</Text>
                    <Text className="sf-record-sub">{shortText(asset.url)}</Text>
                  </View>
                  <StatusPill status="published">{assetTypeText(asset.asset_type || asset.assetType)}</StatusPill>
                </View>
                {preview && asset.url ? (
                  <View className="sf-image-preview">
                    <Image className="sf-preview-image" src={assetUrl(asset.url)} mode="aspectFill" />
                  </View>
                ) : null}
                <View className="sf-record-foot">
                  <Text>{dateTime(asset.created_at)}</Text>
                  <Text onClick={() => copyText(assetUrl(asset.url), 'URL 已复制')}>复制 URL</Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState title="暂无资产" subtitle="模型输出和外部登记的素材会出现在这里。" />
        )}
        <Pager page={page.page} totalPages={page.totalPages} total={page.total} onChange={(nextPage) => applyFilters({ page: nextPage })} />
      </Section>
    </PageShell>
  );
}
