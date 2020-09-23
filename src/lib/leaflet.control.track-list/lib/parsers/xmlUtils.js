function xmlGetNodeText(node) {
    if (node) {
        return Array.prototype.slice.call(node.childNodes)
            .map(function(node) {
                    return node.nodeValue;
                }
            )
            .join('');
    }
    return null;
}

export {xmlGetNodeText};
