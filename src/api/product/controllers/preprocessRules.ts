import { ProductIngredientDetail } from "../services/product";
import { preprocessRules } from "./productPreprocessor";

const clientProductRule:preprocessRules =
{
    Pizza: processPizza,
    Antipasto: deny,
    Bevanda: deny,
}

export default clientProductRule;

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

    //Checking ingredients detail
    let [base,ingredients] = await Promise.all([
        //Check Base
        strapi.documents("api::ingredient.ingredient").findOne(
            {
                documentId: product.baseID,
                fields: ["Type","Price"],
            }
        ),
        //Check Ingredients
        strapi.documents("api::ingredient.ingredient").findMany(
            {
                fields: ["Type","Price"],
                filters:{
                    documentId:product.ingredientsID,
                },
            }
        )
    ]);

    //Validate Ingredient, Only base must be of type pizza base
    const validBase = base ? base.Type === "pizza-base" : false;
    const validIg = ingredients.length > 0 && ingredients.filter((i) => i.Type === "pizza-base").length === 0;

    if(validBase && validIg){
        //Calculate Price
        let price:number = base.Price;
        price += ingredients.reduce((tot,prod) => tot + prod.Price,0);
        //Merging base within the ingredients
        return {
            name: "Custom",
            price: price,
            categoryID:product.categoryID, 
            ingredientsID:[product.baseID,...product.ingredientsID]
        };
    }else{
        return null;
    }
}