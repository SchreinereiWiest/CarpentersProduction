const IDENTIFIER_START = /[\p{L}_]/u;
const IDENTIFIER_PART = /[\p{L}\p{N}_]/u;
const VARIABLE_NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u;

const createVariableLookup = variables => {
    const lookup = new Map();
    (Array.isArray(variables) ? variables : []).forEach(variable => {
        const name = String(variable?.name ?? "").trim();
        const value = Number(variable?.value);
        if (!name || !Number.isFinite(value)) return;
        lookup.set(name, value);
        lookup.set(name.toLocaleUpperCase("de-DE"), value);
    });
    return lookup;
};

const tokenize = expression => {
    const source = String(expression ?? "");
    const tokens = [];
    let index = 0;

    while (index < source.length) {
        const character = source[index];
        if (/\s/.test(character)) {
            index += 1;
            continue;
        }
        if ("+-*/()".includes(character)) {
            tokens.push({ type: character, value: character });
            index += 1;
            continue;
        }
        if (/\d/.test(character) || character === "." || character === ",") {
            const start = index;
            let separators = 0;
            while (index < source.length && /[\d.,]/.test(source[index])) {
                if (source[index] === "." || source[index] === ",") separators += 1;
                index += 1;
            }
            const raw = source.slice(start, index);
            if (separators > 1 || !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) {
                throw new Error(`Ungültige Zahl: ${raw}`);
            }
            tokens.push({ type: "number", value: Number(raw.replace(",", ".")) });
            continue;
        }
        if (IDENTIFIER_START.test(character)) {
            const start = index;
            index += 1;
            while (index < source.length && IDENTIFIER_PART.test(source[index])) index += 1;
            tokens.push({ type: "identifier", value: source.slice(start, index) });
            continue;
        }
        throw new Error(`Nicht erlaubtes Zeichen: ${character}`);
    }

    return tokens;
};

export const evaluateMeasurementExpression = (expression, variables = []) => {
    const source = String(expression ?? "").trim();
    if (!source) return { valid: false, value: null, error: "Wert oder Formel eingeben." };

    try {
        const tokens = tokenize(source);
        const lookup = createVariableLookup(variables);
        const identifiers = new Set();
        let position = 0;

        const peek = () => tokens[position];
        const consume = type => {
            if (peek()?.type !== type) return null;
            position += 1;
            return tokens[position - 1];
        };

        const parsePrimary = () => {
            const number = consume("number");
            if (number) return number.value;

            const identifier = consume("identifier");
            if (identifier) {
                identifiers.add(identifier.value);
                const value = lookup.get(identifier.value) ?? lookup.get(identifier.value.toLocaleUpperCase("de-DE"));
                if (!Number.isFinite(value)) throw new Error(`Unbekannte Aufmaßvariable: ${identifier.value}`);
                return value;
            }

            if (consume("(")) {
                const value = parseExpression();
                if (!consume(")")) throw new Error("Schließende Klammer fehlt.");
                return value;
            }

            throw new Error("Zahl, Variable oder Klammer erwartet.");
        };

        const parseUnary = () => {
            if (consume("+")) return parseUnary();
            if (consume("-")) return -parseUnary();
            return parsePrimary();
        };

        const parseTerm = () => {
            let value = parseUnary();
            while (peek()?.type === "*" || peek()?.type === "/") {
                const operator = tokens[position++].type;
                const right = parseUnary();
                if (operator === "/" && right === 0) throw new Error("Division durch null ist nicht möglich.");
                value = operator === "*" ? value * right : value / right;
            }
            return value;
        };

        const parseExpression = () => {
            let value = parseTerm();
            while (peek()?.type === "+" || peek()?.type === "-") {
                const operator = tokens[position++].type;
                const right = parseTerm();
                value = operator === "+" ? value + right : value - right;
            }
            return value;
        };

        const value = parseExpression();
        if (position !== tokens.length) throw new Error("Die Formel ist unvollständig.");
        if (!Number.isFinite(value)) throw new Error("Das Ergebnis ist keine gültige Zahl.");

        return {
            valid: true,
            value: Math.round(value * 1000) / 1000,
            error: null,
            identifiers: [...identifiers]
        };
    } catch (error) {
        return { valid: false, value: null, error: error.message, identifiers: [] };
    }
};

export const extractMeasurementVariables = aufmas => {
    const variablesByName = new Map();
    (Array.isArray(aufmas?.objects) ? aufmas.objects : []).forEach(object => {
        const name = String(object?.variableName ?? "").trim();
        const value = Number(String(object?.value ?? "").replace(",", "."));
        const unit = object.unit || "mm";
        if (!VARIABLE_NAME.test(name) || !Number.isFinite(value) || unit !== "mm") return;
        variablesByName.set(name.toLocaleUpperCase("de-DE"), {
            name,
            value,
            unit,
            label: object.label || object.type || name,
            status: object.status || "pending"
        });
    });
    return [...variablesByName.values()].sort((left, right) => left.name.localeCompare(right.name, "de"));
};

export const resolveCabinetMeasurementExpressions = (cabinet, variables) => {
    const expressions = cabinet?.measurementExpressions;
    if (!expressions || typeof expressions !== "object") return {};

    return ["width", "height", "depth"].reduce((changes, field) => {
        if (!Object.hasOwn(expressions, field)) return changes;
        const result = evaluateMeasurementExpression(expressions[field], variables);
        if (result.valid && result.value > 0) changes[field] = result.value;
        return changes;
    }, {});
};

const resolvedValue = (expressions, fieldPath, variables, { min = 0, max = Number.POSITIVE_INFINITY } = {}) => {
    if (!Object.hasOwn(expressions, fieldPath)) return undefined;
    const result = evaluateMeasurementExpression(expressions[fieldPath], variables);
    return result.valid && result.value >= min && result.value <= max ? result.value : undefined;
};

const resolveFunctionExpressions = (func, cabinet, variables) => {
    const expressions = func?.measurementExpressions;
    if (!expressions || typeof expressions !== "object") return func;
    let next = func;

    const update = changes => {
        if (Object.entries(changes).every(([key, value]) => Object.is(next[key], value))) return;
        next = { ...next, ...changes };
    };
    const updateNested = (key, changes) => {
        const current = next[key] ?? {};
        if (Object.entries(changes).every(([field, value]) => Object.is(current[field], value))) return;
        update({ [key]: { ...current, ...changes } });
    };

    if (func.type === "shelf") {
        const compartmentCount = resolvedValue(expressions, "compartmentCount", variables, { min: 1 });
        if (compartmentCount !== undefined) update({ compartmentCount });

        const cabinetDepth = Math.max(0, Number(cabinet.depth ?? 0));
        const shelfDepth = resolvedValue(expressions, "shelfDepth", variables, { max: cabinetDepth });
        const shelfFrontOffset = resolvedValue(expressions, "shelfFrontOffset", variables, { max: cabinetDepth });
        if (shelfDepth !== undefined) update({ shelfFrontOffset: cabinetDepth - shelfDepth });
        else if (shelfFrontOffset !== undefined) update({ shelfFrontOffset });

        [
            ["holeRow.spacing", "spacing", 1],
            ["holeRow.frontOffset", "frontOffset", 0],
            ["holeRow.backOffset", "backOffset", 0],
            ["holeRow.startFromBottom", "startFromBottom", 0],
            ["holeRow.endFromTop", "endFromTop", 0]
        ].forEach(([fieldPath, field, min]) => {
            const value = resolvedValue(expressions, fieldPath, variables, { min });
            if (value !== undefined) updateNested("holeRow", { [field]: value });
        });
    }

    if (func.type === "middleWall") {
        const reference = func.positionReference;
        const value = reference
            ? resolvedValue(expressions, `position.${reference}`, variables)
            : undefined;
        if (value !== undefined) update({ positionOffset: value, absoluteOffset: value });
    }

    if (func.type === "legrabox") {
        const positionFromBottom = resolvedValue(expressions, "positionFromBottom", variables);
        if (positionFromBottom !== undefined) update({ positionFromBottom });
        const insideRightOffset = resolvedValue(expressions, "doubling.insideRightOffset", variables);
        if (insideRightOffset !== undefined) updateNested("doubling", { insideRightOffset });
        const thickness = resolvedValue(expressions, "doubling.thickness", variables);
        if (thickness !== undefined) updateNested("doubling", { thickness });
    }

    return next;
};

const resolveSectionExpressions = (section, cabinet, variables) => {
    const functionConfig = Array.isArray(section.functionConfig)
        ? section.functionConfig.map(func => resolveFunctionExpressions(func, cabinet, variables))
        : section.functionConfig;
    const children = Array.isArray(section.children)
        ? section.children.map(child => resolveSectionExpressions(child, cabinet, variables))
        : section.children;
    const functionsChanged = functionConfig?.some((func, index) => func !== section.functionConfig[index]);
    const childrenChanged = children?.some((child, index) => child !== section.children[index]);
    return functionsChanged || childrenChanged ? { ...section, functionConfig, children } : section;
};

export const resolveCabinetFunctionExpressions = (cabinet, variables) => {
    if (!Array.isArray(cabinet?.sections)) return cabinet;
    const sections = cabinet.sections.map(section => resolveSectionExpressions(section, cabinet, variables));
    return sections.some((section, index) => section !== cabinet.sections[index])
        ? { ...cabinet, sections }
        : cabinet;
};
