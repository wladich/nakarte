import {arrayBufferToString} from '~/lib/binary-strings';

import {CustomPromise} from './custom-promise';
import {Semaphore, SemaphoreToken} from './semaphore';

const semaphore = new Semaphore(6);

type HttpResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'binarystring';
type RequestError = null | 'TIMEOUT' | 'CORS' | 'ABORTED';

class HttpResult {
    public readonly status: number;
    public readonly statusText: string;
    public readonly responseText: string | null = null;
    public readonly responseBinaryText: string | null = null;
    public readonly responseJSON: unknown = null;
    public readonly responseXML: Document | null = null;
    public readonly responseArrayBuffer: ArrayBuffer | null = null;
    public readonly responseBlob: Blob | null = null;
    public readonly error: RequestError;
    public readonly getResponseHeader: (headerName: string) => string | null;

    constructor(xhr: XMLHttpRequest, requestedResponseType: HttpResponseType, error: RequestError) {
        this.status = xhr.status;
        this.statusText = xhr.statusText;
        this.error = error;
        this.getResponseHeader = xhr.getResponseHeader.bind(xhr);

        const response: unknown = xhr.response;
        switch (requestedResponseType) {
            case 'text':
                this.responseText = xhr.responseText;
                break;
            case 'json':
                // IE doesnot support responseType=json
                if (typeof xhr.response === 'string') {
                    try {
                        this.responseJSON = JSON.parse(response as string);
                    } catch (e: unknown) {
                        // return null for error
                    }
                } else {
                    this.responseJSON = xhr.response;
                }
                break;
            case 'arraybuffer':
                this.responseArrayBuffer = response as ArrayBuffer | null;
                break;
            case 'blob':
                this.responseBlob = response as Blob | null;
                break;
            case 'document':
                this.responseXML = response as Document | null;
                break;
            case 'binarystring':
                {
                    const arbuf = response as ArrayBuffer | null;
                    if (arbuf && arbuf.byteLength > 0) {
                        this.responseBinaryText = arrayBufferToString(arbuf);
                    }
                }
                break;
            // no default, checked by typescript-eslint
        }
    }

    public formatError(): string | null {
        switch (this.error) {
            case null:
                return null;
            case 'ABORTED':
                return 'HTTP request aborted';
            case 'TIMEOUT':
                return 'HTTP request timeout';
            case 'CORS':
                return 'CORS violation';
            // no default, checked by typescript-eslint
        }
    }

    public formatStatus(): string {
        const message = this.formatError();
        if (message !== null) {
            return message;
        }
        let prefix: string;
        if (this.status < 400) {
            prefix = 'Request successful';
        } else if (this.status < 500) {
            prefix = 'Request error';
        } else {
            prefix = 'Server error';
        }
        return `${prefix}: ${this.status} ${this.statusText}`;
    }

    public isOk(): boolean {
        return this.error === null && this.status >= 200 && this.status < 300;
    }
}

type HttpResultFilter = (result: HttpResult) => boolean;

function retryIfNetworkErrorOrServerError(result: HttpResult): boolean {
    return result.error === 'TIMEOUT' || result.error === 'CORS' || result.status >= 500;
}

type HttpMethod = 'GET' | 'POST';
type HttpBody = Document | BodyInit | null;

type HttpRequestOptions = {
    url: string;
    method?: HttpMethod;
    responseType?: HttpResponseType;
    timeout?: number;
    withCredentials?: boolean;
    headers?: Array<[string, string]>;
    body?: Document | BodyInit | null;
    maxTries?: number;
    retryDelay?: number;
    responseNeedsRetry?: HttpResultFilter;
};

class HttpRequest extends CustomPromise<HttpResult> {
    private aborted = false;
    private retryTimerId = -1;
    private triesLeft: number;
    private abortedOnTimeout = false;
    private readonly url: string;
    private readonly responseType: HttpResponseType;
    private readonly retryDelay: number;
    private readonly responseNeedsRetry: HttpResultFilter;
    private readonly xhr: XMLHttpRequest;
    private readonly method: HttpMethod;
    private readonly body: HttpBody;
    private readonly enqueue: boolean;
    private token?: SemaphoreToken;

    constructor(
        {
            url,
            method = 'GET',
            responseType = 'text',
            timeout = 30000,
            withCredentials = false,
            headers,
            body = null,
            maxTries = 3,
            retryDelay = 500,
            responseNeedsRetry = retryIfNetworkErrorOrServerError,
        }: HttpRequestOptions,
        enqueue = false
    ) {
        super();
        this.method = method;
        this.body = body;
        this.url = url;
        this.enqueue = enqueue;

        const xhr = new XMLHttpRequest();
        this.xhr = xhr;
        this.open();
        if (typeof headers !== 'undefined') {
            for (const [k, v] of headers) {
                xhr.setRequestHeader(k, v);
            }
        }
        if (typeof responseType !== 'undefined') {
            xhr.responseType = responseType === 'binarystring' ? 'arraybuffer' : responseType;
        }
        xhr.timeout = timeout;
        xhr.withCredentials = withCredentials;
        xhr.onreadystatechange = this.onReadyStateChange.bind(this);
        xhr.ontimeout = this.onTimeout.bind(this);
        this.triesLeft = maxTries;
        this.responseType = responseType;
        this.retryDelay = retryDelay;
        this.responseNeedsRetry = responseNeedsRetry;
        this.start(); // eslint-disable-line @typescript-eslint/no-floating-promises
    }

    public abort(): void {
        if (this.aborted) {
            throw new Error('HttpRequest already aborted');
        }
        this.aborted = true;
        clearTimeout(this.retryTimerId);
        this.xhr.abort();
        this.processResponse();
    }

    private async start(): Promise<void> {
        if (this.enqueue) {
            this.token = await semaphore.acquire();
        }
        this.send();
    }

    private open(): void {
        this.xhr.open(this.method, this.url);
    }

    private send(): void {
        this.triesLeft -= 1;
        this.xhr.send(this.body);
    }

    private onTimeout(): void {
        this.abortedOnTimeout = true;
    }

    private onReadyStateChange(): void {
        if (this.xhr.readyState === 4) {
            setTimeout(() => this.processResponse(), 0); // run after processing other events
        }
    }

    private processResponse(): void {
        let error: RequestError;
        if (this.aborted) {
            error = 'ABORTED';
        } else if (this.abortedOnTimeout) {
            error = 'TIMEOUT';
        } else if (this.xhr.response === 0) {
            error = 'CORS';
        } else {
            error = null;
        }
        const result = new HttpResult(this.xhr, this.responseType, error);
        if (this.triesLeft > 0 && this.responseNeedsRetry(result)) {
            this.retryTimerId = window.setTimeout(() => {
                this.open();
                this.send();
            }, this.retryDelay);
        } else {
            this.resolvePromise(result);
        }
    }
}

export {HttpRequest};
