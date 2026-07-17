import { useEffect, useState } from "react";
import axios from "axios";
import ImageCarousel from "./ImageCarousel";


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

                        const response = await axios.get(
                            `/api/files/download/${file.id}`,
                            {
                                withCredentials: true
                            }
                        );


                        return {
                            id: file.id,
                            name: file.fileName,
                            url: response.data.url
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