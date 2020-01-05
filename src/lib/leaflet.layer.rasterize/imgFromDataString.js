function imgFromDataString(xhr) {
    if (xhr.status === 200 && xhr.response.size) {
        const image = new Image();
        let blobUrl = window.URL.createObjectURL(xhr.response);
        const promise = new Promise((resolve, reject) => {
                image.onload = () => {
                    resolve(image);
                    window.URL.revokeObjectURL(blobUrl);
                };
                image.onerror = () => {
                    reject(new Error('Image corrupt'));
                    window.URL.revokeObjectURL(blobUrl);
                };
            }
        );
        image.src = blobUrl;
        return promise;
    }
    return null;
}

export {imgFromDataString};
