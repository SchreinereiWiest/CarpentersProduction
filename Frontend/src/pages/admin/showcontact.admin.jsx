import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";

function ShowContacts() {
//Id aus Url params laden
const { id } = useParams();
const navigate = useNavigate();

const [customer, setCustomer] = useState(null);

useEffect(() => {
const fetchCustomer = async () => {
const { data } = await axios.get(`/api/customers/get/${id}`);
setCustomer(data.customer);
};

fetchCustomer();
}, [id]);

console.log(customer);
return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} className="flex-1" />

        <main className="pt-10 h-full flex-1">

            <div className="justify-left pl-8">
                <div className="relative flex items-left">
                    <h2 className="text-2xl font-bold">{customer?.firstName} {customer?.lastName}</h2>
                    <div className="relative left-8">
                        <Link to={`/Kontakte/edit/${id}`}
                            className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="size-6">
                            <path fillRule="evenodd"
                                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-gray-300 font-medium">Edit</span>
                        </Link>
                    </div>
                </div>
                <p className="">{customer?.companyName}</p>
                <p className="">{customer?.email}</p>
                <p className="">{customer?.phoneMobile}</p>
                <p className="">{customer?.phoneLandline}</p>
                <p className="">{customer?.preferredContact}</p>
                <p className="">{customer?.newsletterOptIn}</p>
                <p className="">{customer?.customerStatus}</p>
                <p className="">{customer?.customerRating}</p>
                <p className="">{customer?.source}</p>

                {customer?.addresses.map((address, index) => (
                <div key={address.id} className="mt-4">
                    <p className="">{address.street} {address.houseNumber}</p>
                    <p className="">{address.postalCode} {address.city}</p>
                    <p className="">{address.state}</p>
                    <p className="">{address.country}</p>
                    <p className="">{address.floor}</p>
                    <p className="">{address.parkingInfo}</p>
                </div>
                ))}

            </div>
        </main>

    </div>
</>
);
}

export default ShowContacts;