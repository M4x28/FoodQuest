/**
 * table service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::table.table', ( ({strapi}) => ({

    //Verify that exist a table with AccessCode <code>
    //Return Table number if found or null if not 
    async verify(code:string){

        const table = await strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: code
            }
        });

        return table ? table.id : null;
    }

})
));
