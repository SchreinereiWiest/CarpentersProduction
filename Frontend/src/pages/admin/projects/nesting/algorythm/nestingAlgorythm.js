import { defaultSettings } from "./helper/defaults";

import { addSheets, createPlateList, createSheets } from "./createPlates";
import { initializeIteration } from "./initIteration";
import { ensureEnoughSheets } from "./ensureEnoughSheets";
import { placePlates } from "./placement/placePlates";
import { optimizeCuts } from "./placement/optimizeCuts";
import { scoreIteration } from "./scoring/scoreIteration";
import { sortingAlgorithms } from "./algorythmus/algorythms";

export function calculateNesting(processedContent, userSettings = {}) {

    const settings = {

        ...defaultSettings,
        ...userSettings

    };

    // fetch content to all plates list
    const platesList = createPlateList(processedContent);

    let bestAlgorythm = [];

    platesList.forEach(sheet => {

        let lastIteration = 0;
        lastIteration = bestAlgorythm.push({MID:sheet.MID, T:sheet.T, iteration:null});
        lastIteration -=1;

        const plates = sheet.plates;
        
        //create Array [1 sheet] default

        const iterations = [];

        for (const algorithm of sortingAlgorithms) {

            const sortedPlates = algorithm.sort(plates, settings);

            let sheets = createSheets(settings.defaultSheet);

            //check if sheet sum can fit, add sheets to fit
            sheets = ensureEnoughSheets(sortedPlates, sheets, settings.defaultSheet);
            
            // console.log(sortedPlates);

            let bestIteration = null;

            let calculateRun = true;

            while (calculateRun) {

                for (let i = 0; i < settings.iterations; i++) { 

                    const iteration = initializeIteration(sheets, settings);

                    const result = placePlates(sortedPlates, iteration, settings);

                    if(result==false) {
                        continue
                    }

                    // console.log(iteration);
                    optimizeCuts(iteration);

                    iteration.score = scoreIteration(iteration);

                    // console.log(iteration.score.score, bestIteration?.score.score, sheets);
                    
                    if (!bestIteration || iteration.score.score > bestIteration.score.score) {

                        bestIteration = iteration;

                        // console.log(iteration.score);


                    }

                    // console.log(iteration);

                }

                if(!bestIteration) {
                    addSheets(sheets, settings.defaultSheet);
                    bestIteration = null;
                } else {
                    calculateRun = false;
                }
            }

            iterations.push(bestIteration);
        }

        let selectscore = null;
        iterations.forEach((object, index) => {
            if (!selectscore) {
                selectscore = {id:index, object:object.score};
            } else if (object.score > selectscore) {
                selectscore = {id:index, object:object.score};
            }
        });
        console.log(iterations[selectscore.id]);

        bestAlgorythm[lastIteration].iteration = iterations[selectscore.id];

    });

return bestAlgorythm;

}