export default {
    routes: [
        {
            method: 'GET',
            path: '/table/access/:accessCode',
            handler: 'table.accessTable',
        },
        {
            method: 'GET',
            path: '/table/status/:accessCode&:sessionCode',
            handler: 'table.tableStatus',
        },
        {
            method: 'POST',
            path: '/table/checkRequest',
            handler: 'table.checkRequest',
        }
    ]
}