import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'

function Home() {

return (
<>
  <div className='h-screen bg-gray-900 text-white flex justify-left'>

    <SideBar selected={0} />

    <main className="pt-25 pl-25 h-full w-full overflow-y-auto">

    </main>
  </div>
</>
);
}
export default Home;