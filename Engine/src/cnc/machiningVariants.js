const xor = (left, right) => Boolean(left) !== Boolean(right);

const variantSuffix = (variant, index) => {
    if (variant?.side === "left") return "L";
    if (variant?.side === "right") return "R";
    return String(index + 1);
};

export const expandCncMachiningVariants = part => {
    const variants = Array.isArray(part?.CNC?.machiningVariants)
        ? part.CNC.machiningVariants
        : [];

    if (variants.length <= 1) {
        return [part];
    }

    return variants.map((variant, index) => {
        const suffix = variantSuffix(variant, index);
        const variantCnc = variant?.cnc ?? part.CNC ?? {};
        const baseHeader = variantCnc.header ?? {};
        const cnc = { ...variantCnc };
        delete cnc.machiningVariants;

        return {
            ...part,
            PID: `${part.PID ?? "PART"}-${suffix}`,
            Objektname: `${part.Objektname ?? "Bauteil"} (${variant.label ?? suffix})`,
            Anzahl: Number(variant.quantity || 1),
            _cncBasePid: part.PID ?? null,
            _cncPartKey: variant.partKey ?? null,
            _cncCabinetId: variant.cabinetId ?? part._cabinetId ?? null,
            _cncMachiningVariant: { ...variant },
            CNC: {
                ...cnc,
                header: {
                    ...baseHeader,
                    sx: xor(baseHeader.sx === true, variant.mirrorX === true)
                }
            }
        };
    });
};

export const getStoredCncVariantHeader = (effectiveHeader, variant) => ({
    ...(effectiveHeader ?? {}),
    sx: xor(effectiveHeader?.sx === true, variant?.mirrorX === true)
});

export const updateCncMachiningVariantHeader = (part, variantId, effectiveHeader) => {
    const variants = Array.isArray(part?.CNC?.machiningVariants)
        ? part.CNC.machiningVariants
        : [];

    if (!variantId || !variants.length) {
        return {
            ...part,
            CNC: {
                ...(part?.CNC ?? {}),
                header: { ...(effectiveHeader ?? {}) }
            }
        };
    }

    const selectedIndex = variants.findIndex(variant => String(variant.id) === String(variantId));
    if (selectedIndex < 0) return part;

    const selectedVariant = variants[selectedIndex];
    const storedHeader = getStoredCncVariantHeader(effectiveHeader, selectedVariant);
    const nextVariants = variants.map((variant, index) => index === selectedIndex
        ? {
            ...variant,
            cnc: {
                ...(variant.cnc ?? {}),
                header: storedHeader
            }
        }
        : variant);

    return {
        ...part,
        CNC: {
            ...(part.CNC ?? {}),
            ...(selectedIndex === 0 ? { header: storedHeader } : {}),
            machiningVariants: nextVariants
        }
    };
};
