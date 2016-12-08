function intArrayToString(arr) {
    var s = [];
    var chunk;
    for (var i = 0; i < arr.length; i += 4096) {
        chunk = arr.subarray(i, i + 4096);
        chunk = String.fromCharCode.apply(null, chunk);
        s.push(chunk);
    }
    return s.join('');
}

function arrayBufferToString(arBuf) {
    var arr = new Uint8Array(arBuf);
    return intArrayToString(arr);
}

const selectFiles = (() => {
    let fileInput;
    return function selectFiles(multiple = false) {
        if (!fileInput) {
            fileInput = document.createElement('input');
            document.body.appendChild(fileInput);
            fileInput.type = 'file';
            fileInput.multiple = !!multiple;
            fileInput.style.display = 'none';
        }
        const result = new Promise(function(resolve) {
                fileInput.onclick = (e) => console.log('click', e);
                fileInput.addEventListener('change', function() {
                        resolve(fileInput.files);
                    }
                );
            }
        );
        fileInput.click();
        return result;
    }
})();

function readFile(file) {
    return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function(e) {
                resolve({
                        data: arrayBufferToString(e.target.result),
                        filename: file.name
                    }
                );
            };
            reader.readAsArrayBuffer(file);
        }
    );
}

function readFiles(files) {
    files = Array.prototype.slice.apply(files);
    return Promise.all(files.map(readFile));
}


export {selectFiles, readFile, readFiles};
