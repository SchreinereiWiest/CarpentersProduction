import { generateShelfCnc } from "./operations/generateShelf";
import { generateMiddleWallCnc } from "./operations/generateMiddleWall";
import { generateLegraboxCnc } from "./operations/generateLegrabox";

export const generateSectionCnc = ({
    section,
    cabinet
}) => {

    const functionType =
        section.functionType;


    const config =
        section.functionConfig ?? {};


    switch (
        functionType
    ) {

        case "shelf":

            return generateShelfCnc({
                section,
                cabinet,
                config
            });


        case "middleWall":

            return generateMiddleWallCnc({
                section,
                cabinet,
                config
            });


        case "legrabox":

            return generateLegraboxCnc({
                section,
                cabinet,
                config
            });


        default:

            return {
                operations: [],
                requirements: []
            };
    }
};