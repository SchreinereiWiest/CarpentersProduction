import { useState } from "react";

import { useNavigate } from "react-router";
import { useAuth } from "../../../app/providers/AuthContext.js";

import axios from "axios";

function Login() {

    const navigate = useNavigate();

    const [company, setCompany] = useState("");

    const [login, setLogin] = useState("");

    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const { checkAuth } = useAuth();

    const handleLogin = async (e) => {

        e.preventDefault();

        try {

            await axios.post(

                "/api/auth/login",

                {
                    company,
                    login,
                    password,
                },
            {
                withCredentials: true
            }
            );

            await checkAuth();

            navigate("/");

        } catch (err) {

            console.error(err);

            setError(err.response?.data?.message || err.response?.data?.error || "Firma, Benutzer oder Passwort ist ungültig");

        }
    };

    return (

        <div className="h-screen overflow-y-auto bg-gray-900 text-white">

            <main className="flex min-h-full w-full items-center justify-center p-4 sm:p-8">

                <div className="w-full items-center justify-center p-0 dark:bg-gray-900 sm:p-2">

                    <div className="relative mx-auto w-full max-w-md rounded-xl bg-white px-6 pb-8 pt-8 shadow-xl ring-1 ring-gray-900/5 sm:px-10 sm:pt-10">

                        <div className="w-full">

                            <div className="text-center">

                                <h1 className="text-3xl font-semibold text-gray-900">
                                    Sign in
                                </h1>

                                <p className="mt-2 text-gray-500">
                                    Sign in below to access your account
                                </p>

                            </div>

                            <div className="mt-5">

                                <form onSubmit={handleLogin}>

                                    <div className="relative mt-6">

                                        <input
                                            type="text"
                                            name="company"
                                            id="company"
                                            placeholder="Firma"
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            className="text-black peer mt-1 w-full border-b-2 border-gray-300 px-0 py-1 placeholder:text-transparent focus:border-gray-500 focus:outline-none"
                                            autoComplete="organization"
                                            required
                                        />

                                        <label
                                            htmlFor="company"
                                            className="pointer-events-none absolute top-0 left-0 origin-left -translate-y-1/2 transform text-sm text-gray-800 opacity-75 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:top-0 peer-focus:pl-0 peer-focus:text-sm peer-focus:text-gray-800"
                                        >
                                            Firma
                                        </label>

                                    </div>

                                    <div className="relative mt-6">

                                        <input
                                            // type="email"
                                            name="email"
                                            id="email"

                                            value={login}

                                            onChange={(e) =>
                                                setLogin(e.target.value)
                                            }

                                            className="text-black peer mt-1 w-full border-b-2 border-gray-300 px-0 py-1 placeholder:text-transparent focus:border-gray-500 focus:outline-none"

                                            autoComplete="off"
                                            required
                                        />

                                        <label
                                            htmlFor="email"

                                            className="pointer-events-none absolute top-0 left-0 origin-left -translate-y-1/2 transform text-sm text-gray-800 opacity-75 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:top-0 peer-focus:pl-0 peer-focus:text-sm peer-focus:text-gray-800"
                                        >
                                            Login
                                        </label>

                                    </div>

                                    <div className="relative mt-6">

                                        <input
                                            type="password"
                                            name="password"
                                            id="password"
                                            placeholder="Password"

                                            value={password}

                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }

                                            className="text-black peer mt-1 w-full border-b-2 border-gray-300 px-0 py-1 placeholder:text-transparent focus:border-gray-500 focus:outline-none"
                                            autoComplete="current-password"
                                            required
                                        />

                                        <label
                                            htmlFor="password"

                                            className="pointer-events-none absolute top-0 left-0 origin-left -translate-y-1/2 transform text-sm text-gray-800 opacity-75 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:top-0 peer-focus:pl-0 peer-focus:text-sm peer-focus:text-gray-800"
                                        >
                                            Password
                                        </label>

                                    </div>

                                    {
                                        error && (

                                            <div className="mt-4 text-sm text-red-500">

                                                {error}

                                            </div>
                                        )
                                    }

                                    <div className="my-6">

                                        <button
                                            type="submit"

                                            className="w-full rounded-md bg-black px-3 py-4 text-white focus:bg-gray-600 focus:outline-none"
                                        >
                                            Sign in
                                        </button>

                                    </div>

                                </form>

                            </div>

                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default Login;
