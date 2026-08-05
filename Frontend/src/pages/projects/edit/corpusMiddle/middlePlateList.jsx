import PlateCard from "./PlateCard";

export default function PlateList({ EditorState }) {

    return (

        <div

            className="
                flex-1
                overflow-y-auto
                p-5
                space-y-3
            "

            onClick={() => EditorState.setActivePlate(null)}

        >

            {
                EditorState.activeCorpus?.type === "KO"

                    ?

                    EditorState.activeCorpus.Children.map(child => (

                        <PlateCard

                            key={child.id}

                            child={child}

                            EditorState={EditorState}

                        />

                    ))

                    :

                    <PlateCard

                        corpus

                        child={EditorState.activeCorpus}

                        EditorState={EditorState}

                    />

            }

        </div>

    );

}