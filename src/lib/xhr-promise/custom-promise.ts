abstract class CustomPromise<T> implements PromiseLike<T> {
    private readonly _promise: Promise<T>;
    private _resolve?: (value?: T | PromiseLike<T>) => void;
    private _reject?: (reason?: Error) => void;

    protected constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: Error) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): PromiseLike<TResult1 | TResult2> {
        return this._promise.then(onfulfilled, onrejected);
    }

    protected resolvePromise(value: T): void {
        if (!this._resolve) {
            throw new Error('CustomPromise has not been initialized');
        }
        this._resolve(value);
    }

    protected rejectPromise(reason?: Error): void {
        if (!this._reject) {
            throw new Error('CustomPromise has not been initialized');
        }
        this._reject(reason);
    }
}

export {CustomPromise};
