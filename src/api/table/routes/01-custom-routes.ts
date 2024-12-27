export default {
    routes: [
        {
            method: 'GET',
            path: '/table/access/:accessCode',
            handler: 'table.accessTable',
        },
        {
            method: 'POST',
            path: '/table/status',
            handler: 'table.tableStatus',
        },
        {
            method: 'POST',
            path: '/table/checkRequest',
            handler: 'table.checkRequest',
        }
    ]
}