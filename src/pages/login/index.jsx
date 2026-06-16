import React, { useState } from 'react';
import { View, Text, Image } from '../../h5-components';
import Taro from '@tarojs/taro';
import { API_BASE, api, setToken } from '../../lib';
import { ActionButton, Notice, Segmented, TextField } from '../../ui';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');

  const submit = async () => {
    if (!email || !password) {
      setTone('error');
      setMessage('请输入邮箱和密码。');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setTone('error');
      setMessage('注册密码至少 8 位。');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const payload =
        mode === 'login'
          ? { email, password }
          : {
              email,
              password,
              displayName: displayName || email.split('@')[0],
            };
      const result = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        data: payload,
      });
      setToken(result.token);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (error) {
      setTone('error');
      setMessage(error.message || '登录失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="sf-login-shell">
      <Image className="sf-login-logo" src="/brand/logo-icon.png" mode="aspectFit" />
      <Text className="sf-login-title">seeFactory</Text>
      <Text className="sf-login-sub">
        在手机上管理工作流、模型调度、资产、账单和创意工坊。登录后即可继续桌面端的生产链路。
      </Text>

      <View className="sf-form-panel">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '登录', value: 'login' },
            { label: '注册', value: 'register' },
          ]}
        />

        <View className="sf-form-spacer" />
        {mode === 'register' ? (
          <TextField
            label="昵称"
            value={displayName}
            placeholder="显示在创意工坊中的名字"
            onChange={setDisplayName}
          />
        ) : null}
        <TextField label="邮箱" value={email} placeholder="you@example.com" onChange={setEmail} />
        <TextField
          label="密码"
          value={password}
          placeholder={mode === 'register' ? '至少 8 位' : '输入密码'}
          password
          onChange={setPassword}
        />

        {message ? <Notice tone={tone}>{message}</Notice> : null}

        <ActionButton loading={loading} onClick={submit}>
          {mode === 'login' ? '进入控制台' : '创建账号'}
        </ActionButton>
      </View>

      <View className="sf-login-meta">
        <Text>API: {API_BASE}</Text>
      </View>
    </View>
  );
}
