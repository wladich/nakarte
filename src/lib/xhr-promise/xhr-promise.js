export default function XMLHttpRequestPromise(url, method='GET', data=null, responseType='', timeout=0) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = responseType;
    xhr.timeout = timeout;
    const result = new Promise(function(resolve, reject) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status) {
                    resolve(xhr);
                } else {
                    reject(xhr);
                }
            }
        }
    });
    xhr.send();
    return result;
}
