import {getSectionFunctions} from "../cncHelpers.js";
import {resolveSectionBoundaries} from "./resolveSections.js";

import {compileShelf} from "./operations/compileShelf.js";
import {compileLegrabox} from "./operations/compileLegrabox.js";

//Main function compiler for section functions

export const compileSectionFunctions = ({
    cabinet,
    parts,
    sections,
    config
}) => {

    sections.forEach(
        section => {

            const functions =
                getSectionFunctions(
                    section
                );


            if (
                functions.length === 0
            ) {
                return;
            }


            const boundaries =
                resolveSectionBoundaries({

                    section,

                    cabinet,

                    parts,

                    sections

                });


            functions.forEach(
                func => {

                    if (
                        func.type === "shelf"
                    ) {

                        compileShelf({
                            section,
                            func,
                            boundary:
                                boundaries.left,
                            config
                        });

                        compileShelf({
                            section,
                            func,
                            boundary:
                                boundaries.right,
                            config
                        });

                    }


                    if (
                        func.type === "legrabox"
                    ) {

                        compileLegrabox({
                            section,
                            func,
                            boundary:
                                boundaries.left,
                            config
                        });


                        compileLegrabox({
                            section,
                            func,
                            boundary:
                                boundaries.right,
                            config
                        });

                    }

                }
            );

        }
    );

};
