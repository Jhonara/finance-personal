export class RefreshCoordinator {
  private pending: Promise<string | null> | null = null;

  run(operation: () => Promise<string | null>): Promise<string | null> {
    if (!this.pending) {
      this.pending = operation().finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }
}
