export default {
    routes: [
        {
            method: 'POST',
            path: '/order/confirm',
            handler: 'order.confirmOrder',
        },
        {
            method: "POST",
            path: "/order/set_status",
            handler: "order.setStatus"
        },
        {
            method: "POST",
            path: "/order/current",
            handler: "order.currentOrder"
        },
        {
            method: "POST",
            path: "/order/get_orders",
            handler: "order.ordersByTable"
        }
    ]
}