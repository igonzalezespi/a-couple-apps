module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['@aca/ui'],
          config: '../../packages/ui/tamagui.config.ts',
          logTimings: true
        }
      ]
    ]
  };
};
