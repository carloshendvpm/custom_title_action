const fs = require('fs');

function hasLabel(labels, name) {
  return labels.some(label => label.name === name);
}

function loadCustomTemplate(path) {
  if (!path || !fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf-8');
}

module.exports = { hasLabel, loadCustomTemplate };
