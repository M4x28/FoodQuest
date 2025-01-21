/**
 * Controller per la gestione degli ordini.
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { OrderState } from '../services/order';

const { ApplicationError, UnauthorizedError } = errors;

export default factories.createCoreController('api::order.order', ({ strapi }) => ({

    /**
     * Conferma un ordine specifico impostandolo come "Pending".
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Messaggio di successo e dettagli dell'ordine aggiornato.
     * @throws {BadRequestError} Se l'ID dell'ordine non è specificato.
     * @throws {NotFoundError} Se l'ordine non è trovato.
     * @throws {InternalServerError} In caso di errore interno del server.
     */
    async confirmOrder(ctx) {
        const { orderID, allCoursesTogetherFlag } = ctx.request.body.data;

        // Verifica che l'ID dell'ordine sia specificato
        if (!orderID) {
            return ctx.badRequest('ID dell\'ordine mancante');
        }

        try {
            // Recupera l'ordine specifico dal database
            const order = await strapi.documents('api::order.order').findOne({
                documentId: orderID
            });

            // Controlla che l'ordine esista
            if (order.documentId !== orderID) {
                return ctx.notFound('Ordine non trovato');
            }

            // Utilizza il servizio per aggiornare lo stato dell'ordine
            const orderService = strapi.service('api::order.order');
            const orderReturn = await orderService.confirmOrder(order.documentId, allCoursesTogetherFlag);

            return ctx.send({ message: 'Ordine confermato con successo', data: orderReturn });
        } catch (error) {
            strapi.log.error('Errore durante la conferma dell ordine: ', error);
            return ctx.internalServerError('Errore del server');
        }
    },

    /**
     * Aggiorna lo stato di un ordine specifico.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} L'ordine aggiornato.
     * @throws {ApplicationError} Se i campi richiesti sono mancanti o non validi.
     */
    async setStatus(ctx) {
        // Verifica la validità dei dati di input
        if (!ctx.request.body.data) {
            throw new ApplicationError("Missing field in request");
        }

        const { orderID, newStatus } = ctx.request.body.data;

        if (!orderID || !newStatus || newStatus == OrderState.New) {
            throw new ApplicationError("Invalid field in request");
        }

        // Recupera l'ordine dal database
        let order = await strapi.documents('api::order.order').findOne({
            documentId: orderID
        });

        if (order == null) {
            throw new ApplicationError("No order found");
        }

        // Termina anticipatamente se lo stato non cambia
        if (newStatus == order.State) {
            return order;
        }

        const services = strapi.service("api::order.order");

        // Gestisce l'aggiornamento quando l'ordine è completato
        if (newStatus == OrderState.Done) {
            services.editOrderAfter(order.Datetime.toString(), -order.PreparationTime);
            services.closeAllpartialOrder(orderID);
            order.TimeToService = 0;
            order.PreparationTime = 0;
        }

        // Aggiorna lo stato dell'ordine nel database
        return await strapi.documents("api::order.order").update({
            documentId: order.documentId,
            data: {
                State: newStatus,
                TimeToService: order.TimeToService,
                PreparationTime: order.PreparationTime,
            }
        });
    },

    /**
     * Recupera l'ordine corrente associato a un tavolo specifico.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Dettagli dell'ordine corrente o null se non esiste.
     * @throws {UnauthorizedError} Se i dettagli del tavolo non sono forniti o non validi.
     */
    async currentOrder(ctx) {
        // Verifica la validità dei dati di input
        if (!ctx.request.body.data) {
            throw new ApplicationError("Missing field in request");
        }

        const { accessCode, sessionCode, editedAfter } = ctx.request.body.data;

        if (!accessCode || !sessionCode) {
            throw new UnauthorizedError("Missing table detail");
        }

        // Verifica l'accesso al tavolo tramite il servizio
        const tableID = await strapi.service("api::table.table").verify(accessCode, sessionCode);

        if (!tableID) {
            throw new UnauthorizedError("Invalid table detail");
        }

        // Recupera l'ordine associato al tavolo
        const order = await strapi.service('api::order.order').getOrderByTable(tableID);

        console.log(JSON.stringify(order, null, 3));

        if (!order) {
            return {
                data: null,
                meta: { edited: true }
            };
        }

        // Controlla se l'ordine è stato modificato dopo una determinata data
        if (editedAfter && new Date(order.updatedAt).getTime() < new Date(editedAfter).getTime()) {
            return {
                meta: { edited: false }
            };
        }

        return {
            data: reduceOrder(order),
            meta: { edited: true }
        };
    },

    /**
     * Recupera tutti gli ordini effettuati da un tavolo specifico.
     * 
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Lista degli ordini effettuati dal tavolo.
     * @throws {UnauthorizedError} Se i dettagli del tavolo non sono forniti o non validi.
     */
    async ordersByTable(ctx) {
        // Verifica la validità dei dati di input
        if (!ctx.request.body.data) {
            throw new ApplicationError("Missing field in request");
        }

        const { accessCode, sessionCode, editedAfter } = ctx.request.body.data;

        if (!accessCode || !sessionCode) {
            throw new UnauthorizedError("Missing table detail");
        }

        // Verifica l'accesso al tavolo tramite il servizio
        const tableID = await strapi.service("api::table.table").verify(accessCode, sessionCode);

        console.log(tableID);

        if (!tableID) {
            throw new UnauthorizedError("Invalid table detail");
        }

        // Recupera tutti gli ordini associati al tavolo
        const orders = await strapi.service("api::order.order").getAllOrderByTable(tableID);

        if (!orders || orders.length == 0) {
            return {
                data: [],
                meta: { edited: true }
            };
        }

        // Filtra gli ordini modificati dopo una determinata data
        if (editedAfter) {
            const editedOrder = orders.filter(o => (new Date(o.updatedAt).getTime() > new Date(editedAfter).getTime()));

            console.log(JSON.stringify(editedOrder, null, 4));

            if (editedOrder.length == 0) {
                return {
                    meta: { edited: false }
                };
            }
        }

        // Riduce gli ordini alla struttura desiderata
        const reducedOrder = orders.map(reduceOrder);

        return {
            data: reducedOrder,
            meta: { edited: true }
        };
    },

    /**
   * Controller per rimuovere un prodotto da un ordine.
   * @param {Object} ctx - Context di Strapi contenente i parametri `orderId` e `productId`.
   */
    async removeProduct(ctx) {
        try {
            // Log della richiesta per debug
            console.log("Richiesta ricevuta:", ctx);

            // Estrazione dei parametri da body.data
            const { orderId, productId } = ctx.request.body?.data || {};

            // Validazione personalizzata dei parametri
            if (!orderId || !productId) {
                return ctx.badRequest('I parametri "orderId" e "productId" sono richiesti.');
            }

            // Chiamata al service per rimuovere il prodotto
            const result = await strapi.service('api::order.order').removeProductFromOrder(orderId, productId);

            if (!result) {
                return ctx.notFound("Prodotto non trovato nell'ordine.");
            }

            // Risposta di successo
            return ctx.send({ message: 'Prodotto rimosso con successo dall\'ordine.' });
        } catch (error) {
            // Log dell'errore
            strapi.log.error('Errore durante la rimozione del prodotto dall\'ordine:', error);

            // Risposta di errore generica
            return ctx.internalServerError('Errore durante la rimozione del prodotto dall\'ordine.');
        }
    },
}));

/**
 * Funzione di utilità per ridurre la struttura di un ordine.
 * 
 * @param {object} o - Oggetto ordine.
 * @returns {object} Ordine ridotto.
 */
const reduceOrder = (o) => {
    const prod = o.partial_orders.map((p) => p.product);

    return {
        documentId: o.documentId,
        status: o.State,
        time: o.TimeToService,
        products: prod,
    };
};