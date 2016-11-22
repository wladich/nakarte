function makeRequest(url, {method='GET', data=null, responseType='', timeout=0} = {}) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = responseType;
    xhr.timeout = timeout;
    const promise = new Promise(function(resolve, reject) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                resolve(xhr);
            }
        }
    });
    return {xhr, promise, send: xhr.send.bind(xhr)};
}

function XMLHttpRequestPromise(url, {method='GET', data=null, responseType='', timeout=0} = {}) {
    const {xhr, promise} = makeRequest(url, {method, data, responseType, timeout});
    xhr.send();
    return promise;
}

export {XMLHttpRequestPromise, makeRequest as prepareXMLHttpRequestPromise};