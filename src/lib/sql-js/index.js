export default function getSqlite3() {
    return new Promise((resolve) => {
        require.ensure(['sql.js/js/sql.js'], () => {
            resolve(require('sql.js/js/sql.js'));
        }, 'sql');
    });
}
