import { useState } from 'react'
import './App.css'
import ProjectCard from './projectCard.jsx'
import SideBar from './sideBar.jsx'

function App() {

    return (
        <>
            <div className='h-full bg-gray-900 text-white flex justify-left'>
    
    <SideBar selected={0} />

    <main className="pt-25 pl-25 h-full w-full overflow-y-auto">
      <div className="h-screen w-full justify-center items-center dark:bg-gray-900 p-2">



      </div>
    </main>
  </div>
</>
);
}
export default App;