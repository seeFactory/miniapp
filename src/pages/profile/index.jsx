import React, { useEffect, useState } from 'react';
import { View } from '../../h5-components';
import Taro from '@tarojs/taro';
import {
  api,
  clearToken,
  money,
  navigateTo,
  requireAuth,
  setThemePreference,
} from '../../lib';
import {
  ActionButton,
  EmptyState,
  PageShell,
  Section,
  SelectField,
  StatGrid,
  TextField,
} from '../../ui';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState({ displayName: '', email: '', theme: 'light', locale: 'zh-CN' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState('');

  const load = async () => {
    if (!requireAuth()) return;
    setMessage('');
    try {
      const [me, nextSummary] = await Promise.all([
        api('/api/users/me'),
        api('/api/users/me/summary'),
      ]);
      setUser(me);
      setSummary(nextSummary);
      const theme = me.preferences?.theme || 'light';
      setProfile({
        displayName: me.displayName || '',
        email: me.email || '',
        theme,
        locale: me.preferences?.locale || 'zh-CN',
      });
      setThemePreference(theme);
    } catch (error) {
      setTone('error');
      setMessage(error.message || '个人资料加载失败。');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async () => {
    if (!profile.displayName || !profile.email) {
      setTone('error');
      setMessage('昵称和邮箱不能为空。');
      return;
    }
    setBusy('profile');
    try {
      const next = await api('/api/users/me', {
        method: 'PATCH',
        data: {
          displayName: profile.displayName,
          email: profile.email,
          preferences: {
            theme: profile.theme,
            locale: profile.locale,
          },
        },
      });
      setUser(next);
      setThemePreference(profile.theme);
      setTone('good');
      setMessage('个人资料已保存。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '保存资料失败。');
    } finally {
      setBusy('');
    }
  };

  const changePassword = async () => {
    if (!password.currentPassword || password.newPassword.length < 8) {
      setTone('error');
      setMessage('请输入当前密码，新密码至少 8 位。');
      return;
    }
    setBusy('password');
    try {
      await api('/api/users/me/password', {
        method: 'PATCH',
        data: password,
      });
      setPassword({ currentPassword: '', newPassword: '' });
      setTone('good');
      setMessage('密码已更新。');
    } catch (error) {
      setTone('error');
      setMessage(error.message || '修改密码失败。');
    } finally {
      setBusy('');
    }
  };

  const logout = () => {
    clearToken();
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  return (
    <PageShell
      eyebrow={user?.role ? `Role: ${user.role}` : 'Profile'}
      title="我的账户"
      subtitle="管理资料、偏好、安全设置，以及快速进入移动端完整功能模块。"
      message={message}
      tone={tone}
      onRefresh={load}
      actions={[
        { label: '钱包', onClick: () => navigateTo('/pages/wallet/index') },
        { label: '模型', onClick: () => navigateTo('/pages/models/index') },
        { label: '资产', onClick: () => navigateTo('/pages/assets/index') },
      ]}
    >
      {user ? (
        <StatGrid
          items={[
            { label: '余额', value: money(user.balanceCents), hint: user.email, tone: 'dark' },
            { label: '工作流', value: summary?.workflows?.total || 0, hint: `${summary?.workflows?.published || 0} 个已发布`, tone: 'green' },
            { label: '任务', value: summary?.tasks?.total || 0, hint: `${summary?.tasks?.succeeded || 0} 次成功`, tone: 'blue' },
            { label: '订单', value: summary?.orders?.total || 0, hint: `${summary?.orders?.pending || 0} 个待支付`, tone: 'yellow' },
          ]}
        />
      ) : (
        <EmptyState title="资料加载中" subtitle="正在连接 seeFactory API。" />
      )}

      <Section title="基础资料">
        <View className="sf-form-panel">
          <TextField label="昵称" value={profile.displayName} placeholder="显示名称" onChange={(value) => setProfile((prev) => ({ ...prev, displayName: value }))} />
          <TextField label="邮箱" value={profile.email} placeholder="登录邮箱" onChange={(value) => setProfile((prev) => ({ ...prev, email: value }))} />
          <SelectField
            label="界面主题"
            value={profile.theme}
            options={[
              { label: '亮色', value: 'light' },
              { label: '暗色', value: 'dark' },
              { label: '跟随系统', value: 'system' },
            ]}
            onChange={(value) => {
              setThemePreference(value);
              setProfile((prev) => ({ ...prev, theme: value }));
            }}
          />
          <SelectField
            label="语言"
            value={profile.locale}
            options={[
              { label: '简体中文', value: 'zh-CN' },
              { label: 'English', value: 'en-US' },
            ]}
            onChange={(value) => setProfile((prev) => ({ ...prev, locale: value }))}
          />
          <ActionButton loading={busy === 'profile'} onClick={saveProfile}>保存资料</ActionButton>
        </View>
      </Section>

      <Section title="安全设置">
        <View className="sf-form-panel">
          <TextField label="当前密码" value={password.currentPassword} password placeholder="当前密码" onChange={(value) => setPassword((prev) => ({ ...prev, currentPassword: value }))} />
          <TextField label="新密码" value={password.newPassword} password placeholder="至少 8 位" onChange={(value) => setPassword((prev) => ({ ...prev, newPassword: value }))} />
          <View className="sf-inline-actions">
            <ActionButton variant="secondary" loading={busy === 'password'} onClick={changePassword}>修改密码</ActionButton>
            <ActionButton variant="warn" onClick={logout}>退出登录</ActionButton>
          </View>
        </View>
      </Section>

      <Section title="模块入口" subtitle="移动端包含 dashboard 的完整职能入口。">
        <View className="sf-panel">
          <View className="sf-inline-actions">
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/workflows/index')}>工作流</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/workshop/index')}>创意工坊</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/tasks/index')}>调用记录</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigateTo('/pages/wallet/index')}>账单</ActionButton>
          </View>
        </View>
      </Section>
    </PageShell>
  );
}
