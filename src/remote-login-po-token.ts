type PoTokenWaiter = {
	resolve: (poToken: string | null) => void;
	timer: ReturnType<typeof setTimeout>;
};

export class RemoteLoginPoToken {
	private value: string | null = null;
	private waiters: PoTokenWaiter[] = [];

	wait(timeoutMs: number): Promise<string | null> {
		if (this.value) return Promise.resolve(this.value);
		return new Promise((resolve) => {
			const waiter: PoTokenWaiter = {
				resolve,
				timer: setTimeout(() => {
					this.waiters = this.waiters.filter((item) => item !== waiter);
					resolve(null);
				}, timeoutMs),
			};
			this.waiters.push(waiter);
		});
	}

	receive(poToken: string): void {
		if (this.value || poToken.length === 0) return;
		this.value = poToken;
		for (const waiter of this.waiters.splice(0)) {
			clearTimeout(waiter.timer);
			waiter.resolve(poToken);
		}
	}
}
