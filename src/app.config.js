export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/workflows/index',
    'pages/playground/index',
    'pages/workshop/index',
    'pages/tasks/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/wallet/index',
    'pages/models/index',
    'pages/assets/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f7f8f3',
    navigationBarTitleText: 'seeFactory',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f7f8f3',
  },
  tabBar: {
    color: '#6f756b',
    selectedColor: '#1e5b50',
    backgroundColor: '#fbfcf8',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '控制台',
      },
      {
        pagePath: 'pages/workflows/index',
        text: '工作流',
      },
      {
        pagePath: 'pages/playground/index',
        text: '操练场',
      },
      {
        pagePath: 'pages/workshop/index',
        text: '工坊',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
});
