import { useState } from "react";

export default function ImageCarousel({ images }) {

const [selectedImage, setSelectedImage] = useState(null);
let columnClass = "columns-1";

if (images.length >= 6) {
    columnClass = "columns-4";
} else if (images.length >= 5) {
    columnClass = "columns-3";
} else if (images.length >= 2) {
    columnClass = "columns-2";
}

if(!images.length) {
return null;
}


return (

<div className={`${columnClass} gap-4 pb-8`}>

    {/* <img src={images[index].url} alt={images[index].name} className="" loading="lazy" /> */}

    {images.map((image) => (

                <div
                    key={image.id}
                    className="
                        mb-4
                        break-inside-avoid
                        overflow-hidden
                        rounded-xl
                        bg-neutral-800
                        shadow-lg
                    "
                    onClick={() => setSelectedImage(image)}
                >
                    

                    <img
                        src={image.url}
                        alt={image.name}
                        loading="lazy"
                        className="
                            w-auto
                            h-full
                            transition-transform
                            duration-300
                            hover:scale-105
                            cursor-pointer
                            
                        "
                    />

                </div>

            ))}

    {
                selectedImage && (

                    <div
                        className="
                            fixed
                            inset-0
                            z-50
                            flex
                            items-center
                            justify-center

                            bg-black/90
                            backdrop-blur-sm
                        "

                        onClick={() => setSelectedImage(null)}

                    >

                        <img

                            src={selectedImage.url}

                            alt={selectedImage.name}

                            className="
                                max-h-[95vh]
                                max-w-[95vw]

                                object-contain
                                rounded-lg
                            "

                            onClick={(e)=>e.stopPropagation()}

                        />



                        <button

                            onClick={() => setSelectedImage(null)}

                            className="
                                absolute
                                top-6
                                right-6

                                flex
                                h-12
                                w-12
                                items-center
                                justify-center

                                rounded-full
                                bg-white/20
                                text-white

                                hover:bg-white/40
                            "

                        >

                            <svg
                                viewBox="0 0 24 24"
                                className="h-7 w-7"
                                fill="none"
                            >

                                <path
                                    d="M6 6L18 18M18 6L6 18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                            </svg>

                        </button>


                    </div>

                )
            }


</div>



);

}