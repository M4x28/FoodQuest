/**
 * guest service aggiornato in base allo schema
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::guest.guest', ({ strapi }) => ({

    // Crea un nuovo utente guest
    async createGuest(tableID: string) {
        const sessionCode = `${tableID}-${Date.now()}`;

        const guest = await strapi.documents('api::guest.guest').create({
            data: {
                SessionCode: sessionCode
            }
        });
        return guest;
    },

    // Recupera un utente guest tramite SessionCode
    async findGuestBySessionCode(sessionCode: string) {
        const guest = await strapi.documents('api::guest.guest').findMany({
            filters: {
                SessionCode: {
                    $eq: sessionCode
                }
            },
            limit: 1
        });
        return guest.length > 0 ? guest[0] : null;
    },

    // Elimina un utente guest
    async deleteGuest(documentId: string) {
        const deletedGuest = await strapi.documents('api::guest.guest').delete({
            documentId
        });
        return deletedGuest;
    },

    // Recupera tutti i guest associati a un tavolo
    async findGuestsByTableID(tableID: string) {
        const guests = await strapi.documents('api::guest.guest').findMany({
            filters: {
                SessionCode: {
                    $contains: tableID
                }
            }
        });
        return guests;
    }
}));
