const bcrypt = require('bcrypt');

module.exports = async function (data) {
  const { type, payload } = data;

  if (type === 'hash') {
    return bcrypt.hash(payload.password, payload.saltOrRounds);
  }

  if (type === 'compare') {
    return bcrypt.compare(payload.data, payload.encrypted);
  }

  throw new Error(`Unknown bcrypt operation: ${type}`);
};
