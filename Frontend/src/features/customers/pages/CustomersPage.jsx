import { useEffect, useState } from 'react'
import SideBar from '../../../shared/components/sideBar.jsx'
import { Link } from "react-router";
import axios from "axios";
import { useNavigate } from 'react-router';


function Contacts() {

  const [customers, setCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchCustomers = async () => {
      try {
        setLoading(true);

        const response = activeSearch
          ? await axios.get(
              `/api/customers/search?search=${encodeURIComponent(activeSearch)}&includeDisplayStatus=true`
            )
          : await axios.get(`/api/customers/all?page=${currentPage}`);

        if (cancelled) return;

        if (activeSearch) {
          setCustomers(response.data);
          setTotalPages(1);
        } else {
          setCustomers(response.data.customers);
          setTotalPages(response.data.totalPages);
        }
      } catch (error) {
        if (!cancelled) console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCustomers();

    return () => {
      cancelled = true;
    };
  }, [activeSearch, currentPage]);

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setActiveSearch(search.trim());
  };

return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} className="flex-1" />

        <main className="h-full min-w-0 flex-1 overflow-y-auto pt-4 sm:pt-10">
            <div className="flex flex-col gap-3 px-4 sm:px-6 lg:relative lg:flex-row lg:items-center">
                <form
                    onSubmit={handleSearch}
                    className="flex w-full max-w-xl rounded-full border bg-gray-50 px-4 py-2 focus-within:border-gray-300 sm:mx-auto sm:px-6">
                    <input type="search" placeholder="Kunden suchen"
                        aria-label="Kunden suchen"
                        className="w-full border-0 bg-transparent px-0 py-0 pr-2 font-semibold text-gray-900 focus:outline-none focus:ring-0 sm:pr-4"
                        name="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)} />
                    <button
                        type="submit"
                        disabled={loading}
                        className="hover:bg-gray-700 transition duration-300 flex flex-row items-center justify-center min-w-[130px] px-4 rounded-full font-medium tracking-wide border disabled:cursor-not-allowed disabled:opacity-50 transition ease-in-out duration-150 text-base bg-gray-900 text-white font-medium tracking-wide border-transparent py-1.5 h-[38px] -mr-3">
                        {loading ? "Suche..." : "Suchen"}
                    </button>
                </form>

                <div className="lg:absolute lg:right-12 xl:right-24">
                    <Link to="/Kontakte/new"
                        className="flex h-12 w-full items-center justify-center rounded-full bg-gray-700 px-4 text-white transition duration-300 hover:bg-gray-600 lg:mx-4 lg:w-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="size-6">
                            <path fillRule="evenodd"
                                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-gray-300 font-medium">Neuer Kontakt</span>
                    </Link>

                </div>

            </div>

            <div className="mx-4 overflow-hidden rounded-lg pt-6 md:mx-10 md:pt-10">
                <table className="responsive-card-table w-full table-fixed">
                    <thead>
                        <tr className="bg-gray-800">
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Name</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Email</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Phone</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Adress</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Status</th>
                        </tr>
                    </thead>

                    <tbody>

                      
  {customers.map((customer) => (
    <tr
      key={customer.id}
      className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
      onClick={() => {navigate(`/Kontakte/info/${customer.id}`)}}
    >
      <td data-label="Name" className="py-4 px-6">
        {customer.firstName} {customer.lastName}
      </td>

      <td data-label="E-Mail" className="py-4 px-6 truncate">
        {customer.email}
      </td>

      <td data-label="Telefon" className="py-4 px-6">
        {customer.phoneMobile}
      </td>

      <td data-label="Ort" className="py-4 px-6">
        {customer.addresses?.[0]?.city}
      </td>

      <td data-label="Status" className="py-4 px-6">
        <span
          className={`py-1 px-2 rounded-full text-xs text-white ${
            customer.customerStatus === "active"
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        >
          {customer.customerStatus}
        </span>
      </td>
    </tr>
  ))}
  {!loading && customers.length === 0 && (
    <tr className="bg-gray-700">
      <td colSpan="5" className="py-8 px-6 text-center text-gray-300">
        {activeSearch ? "Keine Kunden gefunden." : "Keine Kunden vorhanden."}
      </td>
    </tr>
  )}
</tbody>
                </table>
            </div>
            <div className="flex justify-center items-center gap-4 mt-6">
  <button
    disabled={currentPage === 1}
    onClick={() =>
      setCurrentPage((prev) => prev - 1)
    }
    className="bg-gray-700 px-4 py-2 rounded disabled:opacity-50"
  >
    Zurück
  </button>

  <span>
    Seite {currentPage} von {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() =>
      setCurrentPage((prev) => prev + 1)
    }
    className="bg-gray-700 px-4 py-2 rounded disabled:opacity-50"
  >
    Weiter
  </button>
</div>
        </main>
    </div>
</>
);
}
export default Contacts;
