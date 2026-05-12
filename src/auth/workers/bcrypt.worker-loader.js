const path = require('path');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' }
});
module.exports = require(path.resolve(__dirname, 'bcrypt.worker.ts'));
