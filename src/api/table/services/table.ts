/**
 * table service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::table.table', ( ({strapi}) => ({

    //Verify that exist a table with AccessCode <code>
    //Return Table number if found or null if not 
    async verify(code){
        
        const table = await strapi.db.query('api::table.table').findOne({
            where: {
                AccessCode: code
            }
        });

        return table ? table.id : null;
    }

})
));
