/*
    Contains logic to applay to any product before creation based on the category
*/

import { ProductIngredientDetail } from "../services/product";

//Contains preprocess function for each category
const categoryPreprocessRule: { [key:string] : (any) => Promise<ProductIngredientDetail|null> } =
{
    Pizza: processPizza,
    Antipasto: deny,
    Bevanda: deny,
}

//Process product to add based on their category
export default async function productPreprocessor(product:any){
    //Reject product without category, Product must have one
    if(!product.categoryID)
        return null;

    //Fetch categoty name
    const categoryName:string = await strapi.documents("api::category.category")
        .findOne({
            documentId:product.categoryID,
            fields:["Name"],
        })
        .then((category) => category.Name);

    if(categoryName){
        console.log("Creating: ",categoryName);
        //Apply preprocess function to product
        return await categoryPreprocessRule[categoryName](product);
    }else{
        console.log("No category found");
        return null;
    }
}

//Basic deny creation function
async function deny (product:any):Promise<null>{
    return null
};

//Verify that pizza has only one base in the BaseID proprety
async function processPizza(product: any):Promise<ProductIngredientDetail|null> {
    
    //Reject invalid input
    if( !product.baseID || !product.ingredientsID || product.ingredientsID.lenght == 0){
        return null;
    }

    //Checking base validity and ingredients validity in parallel 
    let [validBase,validIg] = await Promise.all([
        //Check Base
        strapi.documents("api::ingredient.ingredient").findOne(
            {
                documentId: product.baseID,
                fields: ["Type"],
            }
        ).then((baseIg) => (baseIg ? baseIg.Type == "pizza-base" : false)),
        //Check Ingredients
        strapi.documents("api::ingredient.ingredient").findMany(
            {
                fields: ["Type"],
                filters:{
                    documentId:product.ingredientsID,
                },
            }
        ).then((igList) => (igList.filter(({Type}) => Type == "pizza-base").length == 0))
    ]);

    if(validBase && validIg){
        //Merging base within the ingredients
        return {
            categoryID:product.categoryID, 
            ingredientsID:[product.baseID,...product.ingredientsID]
        };
    }else{
        return null;
    }
}