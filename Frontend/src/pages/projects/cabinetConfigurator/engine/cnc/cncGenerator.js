import { compileCnc } from "./compiler/cncCompiler";

export const applyCncToParts = (
    cabinet,
    parts
) => {

    return compileCnc(
        cabinet,
        parts
    );
};