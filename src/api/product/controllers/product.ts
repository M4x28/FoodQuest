/**
 * product controller
 */

import { factories } from '@strapi/strapi'
import { errors } from '@strapi/utils';
import { productPreprocessor } from './productPreprocessor';
import clientProductRule from './preprocessRules';

const { ApplicationError, UnauthorizedError } = errors;

const clientPreprocessor = new productPreprocessor(clientProductRule);

interface Table{
    accessCode: string,
    sessionCode: string    
};

export default factories.createCoreController('api::product.product', ( ({strapi}) => ({

    async createCustomProduct(ctx){
        
        if(!ctx.request.body || !ctx.request.body.table || !ctx.request.body.product)
            throw new ApplicationError("Missing field in request");

        const {table,product} = ctx.request.body as {table:Table,product:any};
        
        //Verify valid table access code, only user at a table can access this feature
        const tableID = await strapi.service("api::table.table").verify(table.accessCode,table.sessionCode);
        if(!tableID)
            throw new UnauthorizedError("Invalid table credential");
        
        //Preprocess product before creation
        const processedProd = await clientPreprocessor.process(product);
        if(!processedProd)
            throw new ApplicationError("Wrong Product Format");

        //Creating new product
        const prodID = await strapi.service("api::product.product").createIgProduct(processedProd);
        if(!prodID){
            throw new ApplicationError("Wrong Input Format");
        }
        return {data:{id:prodID}};
    },

    async ingredientOf(ctx) {
        
        const documentId = ctx.params.prodID;

        if(!documentId){
            throw new ApplicationError("Missing ID");
        }

        const ig = await strapi.documents("api::ingredient.ingredient").findMany({
            filters:{
                ingredient_wrappers:{
                    product:{
                        documentId:documentId
                    }
                }
            }
        });

        console.log(JSON.stringify(ig));

        return {
            data:ig
        }
    }

    })
));
