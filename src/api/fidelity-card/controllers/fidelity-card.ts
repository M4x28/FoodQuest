import { factories } from '@strapi/strapi';
import Joi from 'joi';

export default factories.createCoreController('api::fidelity-card.fidelity-card', ({ strapi }) => ({

    /**
     * Aggiorna i punti fedeltà per un utente in base ai prodotti acquistati
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
     * Calcola lo sconto totale per un tavolo dato un array di utenti
     */
    async calculateTableDiscount(ctx) {
        const schema = Joi.object({
            users: Joi.array().items(Joi.string().required()).min(1).required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .calculateTableDiscount(users);

            return ctx.send(response);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante il calcolo dello sconto totale per il tavolo');
        }
    },

    /**
     * Crea una nuova fidelity card per un utente
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
     * Elimina la fidelity card di un utente basandosi sul suo proprietario
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
   * Modifica lo stato del campo UsePoints (0, 1, null)
   */
    async updateUsePoints(ctx) {
        const schema = Joi.object({
            users_permissions_user: Joi.string().required(),
            usePoints: Joi.valid(0, 1, null).required(),
        });

        const { error } = schema.validate(ctx.request.body);
        if (error) {
            return ctx.badRequest({
                message: 'Errore di validazione',
                details: error.details,
            });
        }

        const { users_permissions_user, usePoints } = ctx.request.body;

        try {
            const response = await strapi
                .service('api::fidelity-card.fidelity-card')
                .updateUsePoints(users_permissions_user, usePoints);

            return ctx.send(response);
        } catch (error) {
            strapi.log.error(error.message);
            return ctx.internalServerError('Errore durante l\'aggiornamento dello stato di UsePoints');
        }
    },

    /**
   * Recupera le informazioni di una fidelity card basata sull'ID dell'utente
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
   * Resetta a 0 i punti di una fidelity card se UsePoints è settato a 1
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