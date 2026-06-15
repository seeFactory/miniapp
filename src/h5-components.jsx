import '@tarojs/components/lib/react/react-component-lib/index.js';
import { createReactComponent } from '@tarojs/components/lib/react/react-component-lib/createComponent.js';
import { manipulatePropsFunction } from '@tarojs/components/lib/react/helper.js';
import { defineCustomElement as defineCustomElementTaroButtonCore } from '@tarojs/components/dist/components/taro-button-core.js';
import { defineCustomElement as defineCustomElementTaroImageCore } from '@tarojs/components/dist/components/taro-image-core.js';
import { defineCustomElement as defineCustomElementTaroInputCore } from '@tarojs/components/dist/components/taro-input-core.js';
import { defineCustomElement as defineCustomElementTaroPickerCore } from '@tarojs/components/dist/components/taro-picker-core.js';
import { defineCustomElement as defineCustomElementTaroTextCore } from '@tarojs/components/dist/components/taro-text-core.js';
import { defineCustomElement as defineCustomElementTaroTextareaCore } from '@tarojs/components/dist/components/taro-textarea-core.js';
import { defineCustomElement as defineCustomElementTaroViewCore } from '@tarojs/components/dist/components/taro-view-core.js';

export const View = createReactComponent(
  'taro-view-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroViewCore,
);

export const Text = createReactComponent(
  'taro-text-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroTextCore,
);

export const Button = createReactComponent(
  'taro-button-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroButtonCore,
);

export const Input = createReactComponent(
  'taro-input-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroInputCore,
);

export const Textarea = createReactComponent(
  'taro-textarea-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroTextareaCore,
);

export const Image = createReactComponent(
  'taro-image-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroImageCore,
);

export const Picker = createReactComponent(
  'taro-picker-core',
  undefined,
  manipulatePropsFunction,
  defineCustomElementTaroPickerCore,
);
