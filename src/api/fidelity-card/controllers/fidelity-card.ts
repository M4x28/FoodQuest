import { factories } from '@strapi/strapi';
import Joi from 'joi';

export default factories.createCoreController('api::fidelity-card.fidelity-card', ({ strapi }) => ({

    /**
     * Aggiorna i punti fedeltà per un utente in base ai prodotti acquistati.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Risultato dell'aggiornamento dei punti fedeltà.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async addFidelityPoints(ctx) {
        const schema = Joi.object({
            users_permissions_user: Joi.string().required(),
            productIDs: Joi.array().items(Joi.string().required()).min(1).required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users_permissions_user, productIDs } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .addFidelityPoints(users_permissions_user, productIDs);

            return ctx.send(response);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante l\'aggiornamento dei punti fedeltà');
        }
    },

    /**
     * Calcola lo sconto totale per un tavolo specifico.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Sconto calcolato per il tavolo.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async calculateTableDiscount(ctx) {
        const schema = Joi.object({
            tableNumber: Joi.number().required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { tableNumber } = ctx.request.body;

        try {
            const discount = await strapi
                .service('api::fidelity-card.fidelity-card')
                .calculateTableDiscount(tableNumber);

            return ctx.send({
                success: true,
                discount,
                message: `Lo sconto totale per il tavolo ${tableNumber} è stato calcolato con successo`,
            });
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante il calcolo dello sconto totale per il tavolo');
        }
    },

    /**
     * Crea una nuova fidelity card per un utente.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Fidelity card creata.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async createFidelityCard(ctx) {
        const schema = Joi.object({
            users_permissions_user: Joi.string().required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users_permissions_user } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .createFidelityCard(users_permissions_user);

            return ctx.send(response);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante la creazione della fidelity card');
        }
    },

    /**
     * Elimina la fidelity card di un utente.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Risultato dell'eliminazione.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async deleteFidelityCard(ctx) {
        const schema = Joi.object({
            users_permissions_user: Joi.string().required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users_permissions_user } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .deleteFidelityCard(users_permissions_user);

            return ctx.send(response);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante l\'eliminazione della fidelity card');
        }
    },

    /**
     * Modifica lo stato del campo `UsePoints`.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Stato aggiornato.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async updateUsePoints(ctx) {
        const schema = Joi.object({
            data: Joi.object({
                users_permissions_user: Joi.string().required(),
                usePoints: Joi.valid(0, 1, null, true, false).required(),
            }).required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione dei dati inviati',
                details: error.details.map((detail) => detail.message),
            });
        }

        const {
            data: { users_permissions_user, usePoints },
        } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .updateUsePoints(users_permissions_user, usePoints);

            return ctx.send({
                success: true,
                message: 'UsePoints aggiornato con successo',
                data: response,
            });
        } catch (error) {
            strapi.log.error('Errore nell\'aggiornamento di UsePoints:', error);

            return ctx.internalServerError({
                message: 'Errore durante l\'aggiornamento dello stato di UsePoints',
                details: error.message,
            });
        }
    },

    /**
     * Recupera la fidelity card basata sull'ID utente.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Fidelity card trovata.
     * @throws {ValidationError} Se l'ID utente è mancante.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async getFidelityCard(ctx) {
        const { users_permissions_user } = ctx.params;

        if (!users_permissions_user) {
            return ctx.badRequest({
                message: 'ID utente mancante',
            });
        }

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .getFidelityCard(users_permissions_user);

            if (!response) {
                return ctx.notFound({
                    message: 'Fidelity card non trovata',
                });
            }

            return ctx.send({
                success: true,
                message: 'Fidelity card trovata',
                data: response,
            });
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante il recupero della fidelity card');
        }
    },

    /**
     * Resetta i punti di una fidelity card se `UsePoints` è attivo.
     *
     * @param {object} ctx - Contesto della richiesta.
     * @returns {object} Risultato del reset dei punti.
     * @throws {ValidationError} Se i dati forniti non sono validi.
     * @throws {InternalServerError} Se si verifica un errore interno del server.
     */
    async resetPoints(ctx) {
        const schema = Joi.object({
            users_permissions_user: Joi.array().items(Joi.string().required()).min(1).required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users_permissions_user } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .resetPoints(users_permissions_user);

            const statusCode = response.failed.length > 0 ? 206 : 200;

            return ctx.send({
                success: true,
                message: statusCode === 200 ? 'Reset dei punti completato con successo' : 'Reset parzialmente completato',
                data: response,
            }, statusCode);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante il reset dei punti');
        }
    },
}));