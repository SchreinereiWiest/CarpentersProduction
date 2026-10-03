import React from "react";
import Drill from "./drill";

export default function LgBox({
    operation,
    part,
    operationId,
    selected,
    onSelect
}) {

    return (
        <Drill
            operation={operation}
            part={part}
            operationId={operationId}
            selected={selected}
            onSelect={onSelect}
        />
    );

}