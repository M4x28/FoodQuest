/**
 * category controller
 */

import { factories } from '@strapi/strapi'
import { errors } from '@strapi/utils';

const { ApplicationError } = errors;


export default factories.createCoreController('api::category.category',(({strapi}) => ({
    
    async allProd(ctx){
        
        if(!ctx.params.id){
            throw new ApplicationError("Missing ID in request");
        }

        //find all available product of the selected category
        const result = await strapi.documents("api::product.product").findMany({
            
            filters:{
                category:{
                    documentId:ctx.params.id
                },
                Available: true,
            },
            populate:{
                ingredient_wrapper:{
                    populate:{
                        ingredients:{
                            fields:[]
                        }
                    }
                },
                allergens:{
                    fields:[]
                },
                Image:true
            }
        });

        if(!result){
            throw new ApplicationError("Category not found");
        }

        const prod = result.map(p => {

            let ingredientsID:string[] = undefined;
            if(p.ingredient_wrapper){
                ingredientsID = p.ingredient_wrapper.ingredients.map((i) => i.documentId);
            }

            let allergensID:string[] = undefined;
            if(p.allergens.length > 0){
                allergensID = p.allergens.map((a) => a.documentId);
            }

            return {
                documentId: p.documentId,
                Name: p.Name,
                Price: p.Price,
                ingredients: ingredientsID,
                allergens: allergensID,
                image: p.Image ? (p.Image.hash +  p.Image.ext): null,
            }
        });

        return {data: prod};
    }

})));
