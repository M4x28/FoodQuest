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
        }
    ]
}