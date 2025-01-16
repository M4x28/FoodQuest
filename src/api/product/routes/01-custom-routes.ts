export default {
    routes:[
        {
            method: 'POST',
            path: '/products/create',
            handler: 'product.createCustomProduct',
        },
        {
            method: 'GET',
            path: '/products/ingredient/:prodID',
            handler: 'product.ingredientOf',
        }
    ]
}