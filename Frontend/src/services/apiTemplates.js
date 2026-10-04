
import axios from "axios";


export const downloadFile = async (path) => {

    const response =
        await axios.get(
            path,
            {
                withCredentials:
                    true
            }
        );

    const {

        exists,

        downloadUrl,

    } = response.data;

    if(!exists) {
        return null;
    }

    const fileResponse =
        await fetch(
            downloadUrl
        );


    return fileResponse.json();

}


export const uploadJSONFile = async (path, data) => {
    const response =
            await axios.post(

                path,

                data,

                {
                    withCredentials:
                        true,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

    return response.data;
}