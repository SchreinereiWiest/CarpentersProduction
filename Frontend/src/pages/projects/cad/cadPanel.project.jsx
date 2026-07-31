import React, { Children } from "react";
import { useEffect, useRef, useState } from 'react'


// Editor Panel in CAD viewer

function EditorPanel({ selectedParent, setSelectedParent }) {

    const [eckeOL, seteckeOL] = useState([true]);
    const [eckeOR, seteckeOR] = useState([true]);
    const [eckeUL, seteckeUL] = useState([true]);
    const [eckeUR, seteckeUR] = useState([true]);

    const [fugen, setfugen] = useState([3]);

    const [dropAusführung, setdropAusführung] = useState(false);
    const [dropTeile, setdropTeile] = useState(false);

    // Falls Children existieren -> diese nutzen
    // sonst Parent selbst als Array verwenden
    const source =
        selectedParent?.Children?.length > 0
            ? selectedParent.Children.filter(
                child => child.BPID && child.BPID.trim() !== ""
            )
            : [selectedParent];

    // Gruppieren nach L/B/T
    const grouped = {};

    source.forEach(item => {
        const key = `${item?.L}-${item?.B}-${item?.T}`;

        if (!grouped[key]) {
            grouped[key] = {
                ...item,
                count: 1,
            };
        } else {
            grouped[key].count += 1;
        }
    });

return (
<>
    <div className="bg-gray-800 max-w-2xl shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
            <p className="mt-1 max-w-xl text-sm text-white">
                {selectedParent?.Objektname}
            </p>
        </div>
        <div className="border-t border-gray-900">
            <dl>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Länge
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                        {selectedParent?.L}
                    </dd>
                </div>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Breite
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                        {selectedParent?.B}
                    </dd>
                </div>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Tiefe
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                        {selectedParent?.T}
                    </dd>
                </div>

            </dl>
        </div>

        <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" onClick={()=>
            setdropAusführung(prev => !prev)}>
            <dt className="text-sm font-medium text-white">
                Ausführung
            </dt>

        </div>

        <div className={dropAusführung? "border-t border-gray-900 " : "hidden" }>
            <dl>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Ecken Seite
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                        <label className="inline-flex items-center" htmlFor="redCheckBox">
                            <span className="ml-2">OL </span>
                            <input id="redCheckBox" type="checkbox" className="w-4 h-4 accent-red-600" checked={eckeOL}
                                onChange={(e)=> seteckeOL(e.target.checked)}
                            />

                        </label>
                        <label className="inline-flex items-center" htmlFor="redCheckBox">
                            <span className="ml-2">OR </span>
                            <input id="redCheckBox" type="checkbox" className="w-4 h-4 accent-red-600" checked={eckeOR}
                                onChange={(e)=> seteckeOR(e.target.checked)}
                            />

                        </label>
                        <label className="inline-flex items-center" htmlFor="redCheckBox">
                            <span className="ml-2">UL </span>
                            <input id="redCheckBox" type="checkbox" className="w-4 h-4 accent-red-600" checked={eckeUL}
                                onChange={(e)=> seteckeUL(e.target.checked)}
                            />

                        </label>
                        <label className="inline-flex items-center" htmlFor="redCheckBox">
                            <span className="ml-2">UR </span>
                            <input id="redCheckBox" type="checkbox" className="w-4 h-4 accent-red-600" checked={eckeUR}
                                onChange={(e)=> seteckeUR(e.target.checked)}
                            />

                        </label>
                    </dd>
                </div>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Rückwand
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">

                    </dd>
                </div>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Fugen
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">

                        <input type="text"
                            class="peer bg-transparent h-6 w-10 rounded-lg text-white placeholder-transparent ring-2 px-2 ring-gray-500 focus:ring-sky-600 focus:outline-none focus:border-rose-600"
                            placeholder="Type inside me" />

                    </dd>
                </div>
                <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        Kante
                    </dt>
                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">

                    </dd>
                </div>
            </dl>
        </div>

        <div className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" onClick={()=> setdropTeile(prev => !prev)}>
            <dt className="text-sm font-medium text-white">
                Teile
            </dt>

        </div>

        <div className={dropTeile? "border-t border-gray-900 " : "hidden" }>

            <dl>
                {Object.values(grouped).map(item => (
                <div key={`${item.L}-${item.B}-${item.T}`}
                    className="bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-white">
                        {item.count}x {item.Objektname}
                    </dt>

                    <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                        {`${item.L} | ${item.B} | ${item.T}`}
                    </dd>
                </div>
                ))}

            </dl>
        </div>

    </div>
</>
);
}
export default EditorPanel;