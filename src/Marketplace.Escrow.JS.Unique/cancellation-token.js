class CancellationToken {
  constructor() {
    this.cancelled = false;
  }

  get cancellationRequested() {
    return this.cancelled;
  }

  cancel() {
    this.cancelled = true;
  }
}

module.exports = CancellationToken;