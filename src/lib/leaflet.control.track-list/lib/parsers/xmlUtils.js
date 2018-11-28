function xmlGetNodeText(node) {
    if (node) {
        return Array.prototype.slice.call(node.childNodes)
            .map(function(node) {
                    return node.nodeValue;
                }
            )
            .join('');
    }
}

export {xmlGetNodeText}