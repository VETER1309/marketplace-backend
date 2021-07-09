function logLabelAndValues(entries) {
  const leftPad = Math.max.apply(null, entries.map(([l]) => l.toString().length)) + 1;
  const rightPad = Math.max.apply(null, entries.map(([_, r]) => r.toString().length));
  for(let [l, r] of entries) {
    console.info(`${l.toString().padEnd(leftPad, ' ')}${r.toString().padStart(rightPad, ' ')}`);
  }
}

module.exports = {
  logLabelAndValues
};