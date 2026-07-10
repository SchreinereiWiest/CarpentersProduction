import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';

function EditContacts() {

    // Customer Information
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [companyName, setCompanyName] = useState("");

    const [email, setEmail] = useState("");
    const [phoneMobile, setPhoneMobile] = useState("");
    const [phoneLandline, setPhoneLandline] = useState("");

    const [preferredContact, setPreferredContact] = useState("");

    const [newsletterOptIn, setNewsletterOptIn] = useState(false);

    const [customerStatus, setCustomerStatus] = useState("");
    const [customerRating, setCustomerRating] = useState(0);

    const [source, setSource] = useState("");
    const [notes, setNotes] = useState("");

    // Adress Information
    const [street, setStreet] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");

    const [floor, setFloor] = useState("");
    const [elevatorAvailable, setElevatorAvailable] = useState(false);
    const [parkingInfo, setParkingInfo] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        
        e.preventDefault();

        await axios.post("/api/customers/new", {
            firstName,
            lastName,
            companyName,
            email,
            phoneMobile,
            phoneLandline,
            preferredContact,
            newsletterOptIn,
            customerStatus,
            customerRating,
            source,
            notes,
            street,
            houseNumber,
            postalCode,
            city,
            country,
            floor,
            elevatorAvailable,
            parkingInfo
        },
            {
                withCredentials: true
            });

        navigate("/kontakte");
        console.log("Customer created successfully");
    };

    return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} className="flex-1" />

        <main className="pt-10 h-full flex-1">

            <div className="justify-left pl-8">

                <div>
                    <form className="flex flex-col" onSubmit={handleSubmit}>
                        <div className="w-2/5">
                             <label className="mb-5 block text-base font-semibold text-gray-300 sm:text-xl">
                                User Details
                            </label>
                            <div className="-mx-3 flex flex-wrap">
                               
                                <div className="w-full px-3 sm:w-1/2">
                                    
                                    <div className="mb-5">
                                        <input type="text" name="firstName" id="firstName" placeholder="First Name"
                                            value={firstName} onChange={(e)=> setFirstName(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" /></div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    
                                    <div className="">
                                        <input type="text" name="lastName" id="lastName" placeholder="Last Name"
                                            value={lastName} onChange={(e)=> setLastName(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" />
                                    </div>
                                </div>

                            </div>

                            <div className="mb-5">
                                
                                <input type="text" name="companyName" id="companyName" placeholder="Company Name"
                                    value={companyName} onChange={(e)=> setCompanyName(e.target.value)}
                                className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                            </div>

                            <div className="mb-5">
                                
                                <input type="email" name="email" id="email" placeholder="Email" value={email}
                                    onChange={(e)=> setEmail(e.target.value)}
                                className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                            </div>

                            <div className="mb-5">
                                
                                <input type="text" name="phoneMobile" id="phoneMobile" placeholder="Phone Mobile"
                                    value={phoneMobile} onChange={(e)=> setPhoneMobile(e.target.value)}
                                className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                            </div>

                            <div className="mb-5">
                               
                                <input type="text" name="phoneLandline" id="phoneLandline" placeholder="Phone Landline"
                                    value={phoneLandline} onChange={(e)=> setPhoneLandline(e.target.value)}
                                className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                            </div>

                            <div className="-mx-3 flex flex-wrap">
                                <div className="w-full px-3 sm:w-1/2">
                              
                                    <div className="mb-5">
                                        <input type="text" name="preferredContact" id="preferredContactMethod"
                                            placeholder="Preferred Contact Method" value={preferredContact}
                                            onChange={(e)=> setPreferredContact(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" /></div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <label htmlFor="newsletterOptIn" className="mb-3 block text-base font-medium text-gray-300">
                                        Newsletter Opt-In
                                    </label>
                                    <div className="">
                                        <input type="checkbox" name="newsletterOptIn" id="newsletterOptIn"
                                            placeholder="Newsletter Opt-In" checked={newsletterOptIn} onChange={(e)=>
                                        setNewsletterOptIn(e.target.checked)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" />
                                    </div>
                                </div>

                            </div>

                            <div className="-mx-3 flex flex-wrap">
                                <div className="w-full px-3 sm:w-1/2">
                               
                                    <div className="mb-5">
                                        <input type="text" name="customerStatus" id="customerStatus"
                                            placeholder="Customer Status" value={customerStatus} onChange={(e)=>
                                        setCustomerStatus(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" /></div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                             
                                    <div className="mb-5">
                                        <input type="text" name="customerRating" id="customerRating"
                                            placeholder="Customer Rating" value={customerRating} onChange={(e)=>
                                        setCustomerRating(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6
                                        text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1]
                                        focus:shadow-md" /></div>
                                </div>

                            </div>

                            <div className="mb-2">
                           
                                <input type="text" name="source" id="source" placeholder="Source" value={source}
                                    onChange={(e)=> setSource(e.target.value)}
                                className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                            </div>

                        </div>

                        <div className="absolute right-20 w-2/5">
                             <label className="mb-5 block text-base font-semibold text-gray-300 sm:text-xl">
                                Address Details
                            </label>
                      
                            <div className="-mx-3 flex flex-wrap">
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="area" id="street" placeholder="Street" value={street}
                                            onChange={(e)=> setStreet(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="houseNumber" id="houseNumber"
                                            placeholder="House Number" value={houseNumber} onChange={(e)=>
                                        setHouseNumber(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="postalCode" id="postCode" placeholder="Post Code"
                                            value={postalCode} onChange={(e)=> setPostalCode(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="city" id="city" placeholder="City" value={city}
                                            onChange={(e)=> setCity(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="country" id="country" placeholder="Country"
                                            value={country} onChange={(e)=> setCountry(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="floor" id="floor" placeholder="Floor" value={floor}
                                            onChange={(e)=> setFloor(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>
                                <div className="w-full px-3 sm:w-1/2">
                                    <div className="mb-5">
                                        <input type="text" name="parkingInfo" id="parkingInfo"
                                            placeholder="Parking Information" value={parkingInfo} onChange={(e)=>
                                        setParkingInfo(e.target.value)}
                                        className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                                        font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md"
                                        />
                                    </div>
                                </div>

                            </div>
                            <button type="submit"
                    className="hover:shadow-form w-full rounded-md bg-gray-700 hover:bg-gray-600 duration-300 py-3 px-8 text-center text-base font-semibold text-white outline-none">
                    Speichern
                </button>

                        </div>

                    </form>
                </div>
            </div>

        </main>
    </div>
</>
);
}
export default Contacts;