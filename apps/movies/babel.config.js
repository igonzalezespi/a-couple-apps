module.exports = function (api) {
  api.cache(true);
  // Tamagui runs in runtime mode. The @tamagui/babel-plugin (optimizing compiler /
  // build-time style extraction) is deferred as a perf optimization: it needs a
  // monorepo-correct components + config wiring to extract reliably under pnpm. Runtime
  // mode is functionally identical (styles resolve on the client) and keeps builds simple.
  return {
    presets: ['babel-preset-expo']
  };
};
