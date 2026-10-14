import { useEffect, useState } from "react";
import ImageCarousel from "./ImageCarousel";
import { getS3FileUrl } from "../../services/projectAssetCache.js";


export default function ImageGallery({ files = [] }) {

    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {

        const loadImages = async () => {

            try {

                const imageFiles = files.filter(
                    file => file.mimeType?.startsWith("image/")
                );


                const loadedImages = await Promise.all(

                    imageFiles.map(async (file) => {

                        return {
                            id: file.id,
                            name: file.fileName,
                            url: await getS3FileUrl(file)
                        };

                    })

                );


                setImages(loadedImages);


            } catch (error) {

                console.error(
                    "Images konnten nicht geladen werden",
                    error
                );

            } finally {

                setLoading(false);

            }

        };


        if (files.length) {
            loadImages();
        } else {
            setLoading(false);
        }


    }, [files]);



    if (loading) {

        return (
            <div className="text-gray-500">
                Lade Bilder...
            </div>
        );

    }



    if (!images.length) {

        return (
            <div className="text-gray-500">
                Keine Bilder vorhanden
            </div>
        );

    }



    const carousels = [
        images.filter((_, i) => i % 1 === 0),

    ];



    return (

        <div
            className="
                
            "
        >
            {
                carousels.map(
                    (carousel, index) => (

                        carousel.length > 0 && (

                            <ImageCarousel
                                key={index}
                                images={carousel}
                            />

                        )

                    )
                )
            }

        </div>

    );

}
