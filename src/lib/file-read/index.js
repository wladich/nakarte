import {arrayBufferToString} from '~/lib/binary-strings';

const selectFiles = (() => {
    let fileInput;
    return function selectFiles(multiple = false) {
        if (fileInput) {
            document.body.removeChild(fileInput);
        }
        fileInput = document.createElement('input');
        document.body.appendChild(fileInput);
        fileInput.type = 'file';
        fileInput.multiple = Boolean(multiple);
        fileInput.style.display = 'none';

        const result = new Promise(function(resolve) {
                fileInput.addEventListener('change', function() {
                        resolve(fileInput.files);
                    }
                );
            }
        );
        fileInput.click();
        return result;
    };
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

export {selectFiles, readFiles};
