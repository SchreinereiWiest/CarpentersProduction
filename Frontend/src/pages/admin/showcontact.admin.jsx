import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";

function ShowContacts() {
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
                <h1 className="text-2xl font-bold">{customer?.firstName} {customer?.lastName}</h1>
                <p className="text-gray-400">asasas</p>
            </div>
        </main>

    </div>
</>
    );
}

export default ShowContacts;