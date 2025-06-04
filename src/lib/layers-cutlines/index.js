function getCutline(cutlineName) {
    return async function () {
        return (
            await import(
                /* webpackChunkName: "cutline-[request]" */
                `./${cutlineName}.json`
            )
        ).cutline;
    };
}

export {getCutline};
