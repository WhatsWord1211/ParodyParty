// Polyfill for Array.prototype.toReversed() for Node 18 compatibility
// This must be loaded BEFORE any metro-config code runs
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

module.exports = {};


