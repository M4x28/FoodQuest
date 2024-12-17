/**
 * table service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::table.table', ( ({strapi}) => ({

    //Verify access to table with AccessCode <accessCode> and SessionCode <sessionCode>
    //Return Table number if found or null if not 
    async verify(accessCode:string,sessionCode:string): Promise<string|null>{

        const table = await strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode,
                SessionCode: sessionCode,
                CheckRequest: false,
            }
        });

        return table ? table.documentId : null;
    }

})
));
