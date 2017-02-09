function imgFromDataString(xhr) {
    if (xhr.status === 200 && xhr.response.size) {
        const image = new Image();
        let blobUrl = window.URL.createObjectURL(xhr.response);
        const promise = new Promise((resolve) => {
                image.onload = () => {
                    resolve(image);
                    window.URL.revokeObjectURL(blobUrl);
                };
            }
        );
        image.src = blobUrl;
        return promise;
    } else {
        return null;
    }
}

export {imgFromDataString}
