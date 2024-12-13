/**
 * product controller
 */

import { factories } from '@strapi/strapi'
import { errors } from '@strapi/utils';
import { ProductIngredientDetail } from '../services/product';

const { ApplicationError, UnauthorizedError } = errors;

export default factories.createCoreController('api::product.product', ( ({strapi}) => ({

    async createCustomProduct(ctx){
        
        if(!ctx.request.body || !ctx.request.body.table || !ctx.request.body.product)
            throw new ApplicationError("Missing field in request");

        const {table,product} = ctx.request.body as {table:string,product:ProductIngredientDetail};
        
        //Verify valid table access code, only user at a table can access this feature
        const tableNum = await strapi.service("api::table.table").verify(table);
        if(!tableNum)
            throw new UnauthorizedError("Invalid Table number");

        //Creating new product
        const prodID = await strapi.service("api::product.product").createIgProduct(product);
        if(!prodID){
            throw new ApplicationError("Wrong Input Format");
        }
        return {data:{id:prodID}};
    }

    })
));
