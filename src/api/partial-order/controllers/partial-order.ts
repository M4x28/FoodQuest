// Controller per la gestione degli ordini parziali
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::partial-order.partial-order', ({ strapi }) => ({

    async create(ctx) {
        try {
            //console.log(ctx.state.user);
            const { productID, users_permissions_user, accessCode, sessionCode } = ctx.request.body.data;

            if (!productID || !accessCode || !sessionCode || !users_permissions_user) {
                return ctx.badRequest('Richiesta non valida dati mancanti');
            }

            // Verifico e recupero il documentId del tavolo
            const tableService = strapi.service('api::table.table');
            const tableID = await tableService.verify(accessCode, sessionCode);
            //console.log(accessCode + sessionCode + tableID);

            // Crea l'ordine parziale usando il servizio
            if (tableID !== null) {
                const partialOrderService = strapi.service('api::partial-order.partial-order');
                const partialOrder = await partialOrderService.addPartialOrder(productID, tableID, users_permissions_user);
                return ctx.created({ message: 'Ordine parziale creato con successo', data: partialOrder });
            }

            return ctx.created({ message: 'Ordine parziale non creato'});
        } catch (error) {
            console.error('Errore durante la creazione dell ordine parziale: ', error);
            return ctx.internalServerError('Errore del server durante la creazione dellordine parziale');
        }
    }

}));
