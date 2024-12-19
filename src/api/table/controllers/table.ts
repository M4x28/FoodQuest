/**
 * table controller
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError, UnauthorizedError } = errors;

export default factories.createCoreController('api::table.table', (({ strapi }) => ({

    async accessTable(ctx) {

        if (!ctx.params || !ctx.params.accessCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const { accessCode } = ctx.params;

        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table || table.CheckRequest) {
            throw new UnauthorizedError("No valid table found");
        }

        return {
            data: {
                number: table.Number,
                sessionCode: table.SessionCode,
            }
        };
    },

    async tableStatus(ctx) {

        if (!ctx.params || !ctx.params.accessCode || !ctx.params.sessionCode) {
            throw new ApplicationError("Missing parameter in query");
        }

        const { accessCode, sessionCode } = ctx.params;

        const table = await strapi.service('api::table.table').getTable(accessCode);

        if (!table) {
            throw new UnauthorizedError("No valid table found");
        }

        return (table.SessionCode === sessionCode && !table.CheckRequest) ? "OK" : "CLOSED";
    }

})
));
