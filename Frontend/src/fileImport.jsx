import React from 'react';
import axios from "axios";
import FormData from "form-data";

class FileInput extends React.Component {
handleFileInput = (event) => {
	const file = event.target.files[0];
	this.file = file;
  this.onFileUpload(this.file);
};

onFileUpload = (file) => {

const form = new FormData();
  form.append("file", file);
  form.append("description", "My uploaded file");

  axios.post("http://localhost:5000/uploadFile", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((response) => {
      this.props.onUploadSuccess();
  });
  
};

render() {
return (
<>

  <div
    className="relative bg-white border rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700 transform transition duration-500 hover:scale-105">

    <div className="p-2 flex justify-center">
      <a className="w-full" href="#">
        <link rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        </link>
        <div className="w-full">
          <div
            className="relative border-dotted h-48 rounded-lg border-dashed border-2 border-blue-700 bg-gray-100 flex justify-center items-center">

            <div className="absolute">

              <div className="flex flex-col items-center">
                <i className="fa fa-folder-open fa-4x text-blue-700"></i>
                <span className="block text-gray-400 font-normal">Attach you files here</span>
              </div>
            </div>

            <input className="w-full h-full opacity-0" type="file" onChange={this.handleFileInput} />

          </div>
        </div>
      </a>
    </div>

    <div className="px-4 pb-3">
      <div>
        <a href="#">
          <h5
            className="text-xl font-semibold tracking-tight hover:text-violet-800 dark:hover:text-violet-300 text-gray-900 dark:text-white ">
            Card
          </h5>
        </a>

        <p className="antialiased text-gray-600 dark:text-gray-400 text-sm break-all">
          A card component
        </p>
      </div>
    </div>

  </div>

</>
);
}
}

export default FileInput;