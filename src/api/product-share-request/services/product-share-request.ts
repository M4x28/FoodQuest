/**
 * product-share-request service aggiornato con supporto per utenti guest
 */

import { factories } from '@strapi/strapi';

// Definizione del tipo enumerazione per lo stato della richiesta
enum RequestStatus {
    Pending = 'Pending',
    Accepted = 'Accepted',
    Declined = 'Declined'
}

export default factories.createCoreService('api::product-share-request.product-share-request', ({ strapi }) => ({

    // Crea una nuova richiesta di condivisione
    async createProductShareRequest(
        productID: string,
        tableID: string,
        requesterIDs: string[],
        guestSessionCodes: string[]
    ) {
        // Crea utenti guest
        const guestUsers = await Promise.all(
            guestSessionCodes.map(async (sessionCode) => {
                const guest = await strapi.documents('api::guest.guest').findMany({
                    filters: {
                        SessionCode: {
                            $eq: sessionCode
                        }
                    },
                    limit: 1
                });
                return guest.length > 0 ? { documentId: guest[0].documentId } : null;
            })
        ).then(results => results.filter(Boolean));

        // Crea la richiesta di condivisione
        const request = await strapi.documents('api::product-share-request.product-share-request').create({
            data: {
                product: { documentId: productID },
                table: { documentId: tableID },
                users_permissions_users: requesterIDs.map(id => ({ documentId: id })),
                guest_users: guestUsers,
                State: RequestStatus.Pending
            },
        });
        return request;
    },

    // Accetta una richiesta di condivisione
    async acceptProductShareRequest(requestID: string) {
        const updatedRequest = await strapi.documents('api::product-share-request.product-share-request').update({
            documentId: requestID,
            data: { State: RequestStatus.Accepted }
        });
        return updatedRequest;
    },

    // Rifiuta una richiesta di condivisione
    async declineProductShareRequest(requestID: string) {
        const updatedRequest = await strapi.documents('api::product-share-request.product-share-request').update({
            documentId: requestID,
            data: { State: RequestStatus.Declined }
        });
        return updatedRequest;
    },

    // Recupera richieste attive per un tavolo
    async getActiveRequestsByTable(tableID: string) {
        const requests = await strapi.documents('api::product-share-request.product-share-request').findMany({
            filters: {
                table: { documentId: tableID },
                State: RequestStatus.Pending
            },
            populate: ['product', 'users_permissions_users', 'guests']
        });
        return requests;
    }
}));
