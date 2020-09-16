type Token = number;
type SemaphoreResolver = (token: Token) => void;
type QueueItem = [token: Token, resolver: SemaphoreResolver];

class Semaphore {
    public readonly size: number;
    private readonly queue: Array<QueueItem> = [];
    private readonly active: Set<Token> = new Set();
    private lastToken: Token = 0;

    constructor(size: number) {
        if (size < 1) {
            throw new Error('Semaphore size can not be less than 1');
        }
        this.size = size;
    }

    public async acquire(): Promise<Token> {
        this.lastToken += 1;
        const token = this.lastToken;
        return new Promise((resolve) => {
            this.queue.push([token, resolve]);
            this.processQueue();
        });
    }

    public release(token: Token): void {
        this.active.delete(token);
        this.processQueue();
    }

    private processQueue(): void {
        if (this.active.size < this.size) {
            const item = this.queue.shift();
            if (item) {
                const [token, resolve] = item;
                this.active.add(token);
                resolve(token);
            }
        }
    }
}

export {Semaphore, Token as SemaphoreToken};
