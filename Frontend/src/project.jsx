import React from "react";
import axios from "axios";
import queryString from "query-string";
import SideBar from "./sideBar.jsx";


function ImageCarousel({ ImageList, startingIndex = 0 }) {

    const [currentIndex, setCurrentIndex] = React.useState(startingIndex);

    if (!ImageList || ImageList.length === 0 || !ImageList[currentIndex]) {
        return <p>Lade Bilder...</p>;
    }

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % ImageList.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + ImageList.length) % ImageList.length);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    return (
        <div className="relative w-full max-w-2xl">

            <img
                src={`http://localhost:5000/project/File?id=${queryString.parse(window.location.search).id}&name=${ImageList[currentIndex].path}`}
                alt=""
                className="rounded-xl shadow-xl ring-1 ring-gray-400/10 w-full"
            />

            {/* PREV */}
            <button onClick={prevSlide}
                className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 px-3 py-2 rounded hover:bg-black/70">
                <span class="inline-flex items-center justify-center w-10 h-10 rounded-base">
                    <svg class="w-5 h-5 text-white rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 19-7-7 7-7" /></svg>
                    <span class="sr-only">Previous</span>
                </span>
            </button>

            {/* NEXT */}
            <button onClick={nextSlide}
                className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 px-3 py-2 rounded hover:bg-black/70">
                <span class="inline-flex items-center justify-center w-10 h-10 rounded-base">
                    <svg class="w-5 h-5 text-white rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7" /></svg>
                    <span class="sr-only">Next</span>
                </span>
            </button>

            {/* INDICATORS */}
            <div className="flex justify-center mt-4 space-x-2">
                {ImageList.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`w-3 h-3 rounded-full ${i === currentIndex ? "bg-white" : "bg-gray-500"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}

class Project extends React.Component {


    state = {
        ImageList: [],
        description: {}
    };

    componentDidMount() {
        this.query = queryString.parse(window.location.search);
        this.getImageList();
        this.getDescription();
    }

    getImageList = () => {
        axios
            .get(`http://localhost:5000/project/imageList?id=${this.query.id}`)
            .then((response) => {
                this.setState({ ImageList: response.data });
            })
            .catch((error) => {
                console.error("Error fetching images:", error);
            });
    };

    getDescription = () => {
        
        axios
            .get(`http://localhost:5000/project/File?id=${this.query.id}&name=CP/description.json`)
            .then((response) => {
                this.setState({ description: response.data });
            })
            .catch((error) => {
                console.error("Error fetching images:", error);
            });
            
    };

    render() {
return (
<>
    <div className='h-full bg-gray-900 text-white flex justify-left'>

     <SideBar selected={1} />

     <main className="pt-10 h-full w-full overflow-y-auto pl-25">
         <div className="h-max w-full justify-center items-center dark:bg-gray-900">

             <div className="mb-10">
                 <div className="mx-auto grid max-w-none grid-cols-2 gap-10 pr-10">

                     <ImageCarousel ImageList={this.state.ImageList} startingIndex={0} />

                     <div className="pl-2">
                         <div className="lg:max-w-lg">
                             <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                                 {this.state.description.name}</p>
                             <p className="mt-2 text-xl leading-8 text-white">{this.state.description.description}</p>
                             <dl className="mt-4 max-w-xl space-y-6 text-lg leading-7 text-white">
                                 <div className="relative pl-2">

                                     <dd>
                                         <ul>
                                             {this.state.description?.materials &&
                                             Object.entries(this.state.description.materials).map(([key, value]) => (
                                             <li key={key} className="flex gap-2">
                                                 <span className="font-semibold">{key}:</span>
                                                 <span>{value}</span>
                                             </li>
                                             ))
                                             }
                                         </ul>
                                     </dd>
                                 </div>
                                 <div className="relative pl-2">

                                     <dd>
                                         <ul>
                                             {this.state.description?.beschlaege &&
                                             Object.entries(this.state.description.beschlaege).map(([key, value]) => (
                                             <li key={key} className="flex gap-2">
                                                 <span className="font-semibold">{key}:</span>
                                                 <span>{value}</span>
                                             </li>
                                             ))
                                             }
                                         </ul>
                                     </dd>
                                 </div>
                                 <div className="relative pl-2">

                                     <dd className="inline">{this.state.description.griffe}
                                     </dd>
                                 </div>
                             </dl>
                         </div>

                     </div>
                     <ImageCarousel ImageList={this.state.ImageList} startingIndex={1} />
                     <ImageCarousel ImageList={this.state.ImageList} startingIndex={2} />
                 </div>
             </div>

         </div>
     </main>
 </div>
 </>
 );}
 }
 export default Project;