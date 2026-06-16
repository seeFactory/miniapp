import { defineConfig } from '@tarojs/cli';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const resolveModule = (request) => path.normalize(require.resolve(request));

export default defineConfig(async () => ({
  projectName: 'seefactory-mobile',
  date: '2026-06-16',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2 / 1
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true
      },
      cssModules: {
        enable: false
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    webpackChain(chain) {
      chain.resolve.alias.set(
        '@tarojs/plugin-platform-h5/dist/runtime',
        resolveModule('@tarojs/plugin-platform-h5/dist/runtime/index.js')
      );
      chain.resolve.alias.set(
        '@tarojs/plugin-framework-react/dist/runtime',
        resolveModule('@tarojs/plugin-framework-react/dist/runtime.js')
      );
      chain.resolve.alias.set(
        '@tarojs/components/dist/components$',
        resolveModule('@tarojs/components/dist/components/index.js')
      );
    },
    router: {
      mode: 'hash'
    },
    devServer: {
      host: '0.0.0.0',
      port: 18183
    }
  }
}));
