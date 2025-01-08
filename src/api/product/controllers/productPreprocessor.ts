/*
    Contains logic to applay to any product before creation based on the category
*/

import { ProductIngredientDetail } from "../services/product";

export interface preprocessRules{
    [key:string] : (any) => Promise<ProductIngredientDetail|null>
}

export class productPreprocessor{
    
    private ruleset:preprocessRules;

    constructor(ruleset:preprocessRules){
        this.ruleset = ruleset;
    }

    //Process product to add based on their category
    async process(product:any):Promise<ProductIngredientDetail|null>{
        //Reject product without category, Product must have one
        if(!product.categoryID)
            return null;

        //Fetch categoty name
        const category = await strapi.documents("api::category.category")
            .findOne({
                documentId:product.categoryID,
                fields:["Name"],
            })

        if(category && this.ruleset[category.Name]){
            console.log("Creating: ",category.Name);
            //Apply preprocess function to product
            return await this.ruleset[category.Name](product);
        }else{
            console.log("No category found");
            return null;
        }
    }
}