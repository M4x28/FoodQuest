/**
 * Controller per confermare l'ordine
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { OrderState } from '../services/order';

const { ApplicationError } = errors;

export default factories.createCoreController('api::order.order', ({ strapi }) => ({

    async confirmOrder(ctx) {
        const { orderID } = ctx.request.body.data;

        // Verifica che il tavolo sia specificato
        if (!orderID) {
            return ctx.badRequest('ID dell\'ordine mancante');
        }

        try {
            const order = await strapi.documents('api::order.order').findOne({
                documentId: orderID
            });

            if (order.documentId !== orderID) {
                return ctx.notFound('Ordine non trovato');
            }

            // Aggiorna lo stato dell'ordine a 'Pending'
            const orderService = strapi.service('api::order.order');
            const orderReturn = await orderService.confirmOrder(order.documentId);

            return ctx.send({ message: 'Ordine confermato con successo', data: orderReturn });
        } catch (error) {
            strapi.log.error('Errore durante la conferma dell ordine: ', error);
            return ctx.internalServerError('Errore del server');
        }
    },

    async setStatus(ctx){

        //Check input validity
        if(!ctx.request.body.data){
            throw new ApplicationError("Missing field in request");
        }

        const {orderID,newStatus} = ctx.request.body.data;

        if(!orderID || !newStatus || newStatus == OrderState.New){
            throw new ApplicationError("Invalid field in request");
        }

        let order = await strapi.documents('api::order.order').findOne({
            documentId: orderID
        });

        if(order == null){
            throw new ApplicationError("No order found");
        }

        //In case there isn't a meaningful change in state terminate early
        if(newStatus == order.State){
            return order;
        }

        const services = strapi.service("api::order.order");

        //if the order is ready update time to service of every following order
        if(newStatus == OrderState.Done){
            services.editOrderAfter(order.Datetime.toString(), -order.PreparationTime);
            services.closeAllpartialOrder(orderID);
            order.TimeToService = 0;
            order.PreparationTime = 0;
        }

        //Update order
        return await strapi.documents("api::order.order").update({
            documentId: order.documentId,
            data:{
                State: newStatus,
                TimeToService: order.TimeToService,
                PreparationTime: order.PreparationTime,
            }
        })
    }

}));
