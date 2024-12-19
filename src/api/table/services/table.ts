/**
 * table service
 */

import { factories } from '@strapi/strapi';
import { ApiTableTable } from '../../../../types/generated/contentTypes';

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
    },

    //Get table info from the accessCode
    async getTable(accessCode:string){
        return strapi.documents('api::table.table').findFirst({
            filters: {
                AccessCode: accessCode,
            }
        });
    }

})
));
