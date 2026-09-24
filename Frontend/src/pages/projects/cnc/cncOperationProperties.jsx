

function OperationProperties({
    operation
}) {

    const entries =
        Object.entries(operation)
            .filter(([key]) =>
                key !== "id" &&
                key !== "type"
            );

    return (
        <div className="space-y-2">

            {entries.map(
                ([key, value]) => {

                    if (
                        value === null ||
                        value === undefined
                    ) {
                        return null;
                    }

                    if (
                        typeof value === "object"
                    ) {
                        return (
                            <div
                                key={key}
                                className="
                                    rounded
                                    bg-gray-900
                                    p-2
                                "
                            >

                                <div className="
                                    text-xs
                                    text-gray-500
                                ">
                                    {key}
                                </div>

                                <pre className="
                                    mt-1
                                    text-xs
                                    text-gray-300
                                    whitespace-pre-wrap
                                    break-all
                                ">
                                    {
                                        JSON.stringify(
                                            value,
                                            null,
                                            2
                                        )
                                    }
                                </pre>

                            </div>
                        );
                    }

                    return (
                        <div
                            key={key}
                            className="
                                flex
                                justify-between
                                gap-4
                                text-sm
                            "
                        >

                            <span className="
                                text-gray-500
                            ">
                                {key}
                            </span>

                            <span className="
                                text-gray-200
                                text-right
                            ">
                                {String(value)}
                            </span>

                        </div>
                    );
                }
            )}

        </div>
    );
}