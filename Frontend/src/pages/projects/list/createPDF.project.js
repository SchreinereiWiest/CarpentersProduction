import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


function drawEdgeSketch(doc, item, x, y, size = 12) {

    const left = item.ELID;
    const right = item.ERID;
    const top = item.ETID;
    const bottom = item.EBID;


    /*
     * Grundfläche
     *
     * Sehr hell, damit die Skizze auf dem Ausdruck
     * nicht zu dominant wird.
     */
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(190, 190, 190);

    doc.rect(
        x,
        y,
        size,
        size,
        "FD"
    );


    /*
     * Kanten
     */

    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.8);


    // Links
    if (left) {

        doc.line(
            x,
            y,
            x,
            y + size
        );

    }


    // Rechts
    if (right) {

        doc.line(
            x + size,
            y,
            x + size,
            y + size
        );

    }


    // Oben
    if (top) {

        doc.line(
            x,
            y,
            x + size,
            y
        );

    }


    // Unten
    if (bottom) {

        doc.line(
            x,
            y + size,
            x + size,
            y + size
        );

    }

}

/*
 * Erstellt die Teileliste als PDF
 */
export function createPartsListPDF(processedContent) {

    const doc = new jsPDF({

        orientation: "portrait",
        unit: "mm",
        format: "a4"

    });


    /*
     * --------------------------------------------------
     * Seitengröße
     * --------------------------------------------------
     */

    const pageWidth =
        doc.internal.pageSize.getWidth();

    const pageHeight =
        doc.internal.pageSize.getHeight();


    /*
     * --------------------------------------------------
     * Überschrift
     * --------------------------------------------------
     */

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");

    doc.setTextColor(40, 40, 40);

    doc.text(
        "Teileliste",
        15,
        15
    );


    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.setTextColor(110, 110, 110);

    doc.text(
        `Erstellt am: ${new Date().toLocaleDateString("de-DE")}`,
        15,
        21
    );


    /*
     * --------------------------------------------------
     * Tabellenzeilen
     * --------------------------------------------------
     */

   const rows = [];


/*
 * --------------------------------------------------
 * Kantenmaterialien erzeugen
 * --------------------------------------------------
 */

function getEdgeMaterials(item) {

    const edges = {};

    if (item.ETID) {
        if (!edges[item.ETID]) edges[item.ETID] = [];
        edges[item.ETID].push("O");
    }

    if (item.ERID) {
        if (!edges[item.ERID]) edges[item.ERID] = [];
        edges[item.ERID].push("R");
    }

    if (item.EBID) {
        if (!edges[item.EBID]) edges[item.EBID] = [];
        edges[item.EBID].push("U");
    }

    if (item.ELID) {
        if (!edges[item.ELID]) edges[item.ELID] = [];
        edges[item.ELID].push("L");
    }

    return Object.entries(edges)
        .map(([material, sides]) => {
            return `${sides.join(", ")}: ${material}`;
        })
        .join(" · ");
}


/*
 * --------------------------------------------------
 * Daten für Tabelle vorbereiten
 * --------------------------------------------------
 */

processedContent.forEach(item => {

    /*
     * Parent
     */

    rows.push({

        type: "parent",

        data: [
            item.Objektname || "",
            item.Anzahl ?? "",
            item.L ?? "",
            item.B ?? "",
            item.T ?? "",
            item.MID || "",
            "",
            ""
        ]

    });


    /*
     * Children
     */

    (item.Children || []).forEach(child => {

        rows.push({

            type: "child",

            data: [
                `    ${child.Objektname || ""}`,
                child.Anzahl ?? "",
                child.L ?? "",
                child.B ?? "",
                child.T ?? "",
                child.MID || "",
                getEdgeMaterials(child),
                ""
            ],

            item: child

        });

    });

});


/*
 * --------------------------------------------------
 * Tabelle
 * --------------------------------------------------
 */

autoTable(doc, {

    startY: 27,


    head: [[
        "Bauteil",
        "Anz",
        "L",
        "B",
        "T",
        "Material",
        "Kantenmaterial",
        ""
    ]],


    body: rows.map(row => row.data),


    margin: {
        left: 12,
        right: 12
    },


    styles: {

        fontSize: 8,

        cellPadding: {
            top: 2,
            bottom: 2,
            left: 2,
            right: 2
        },

        textColor: [50, 50, 50],

        lineColor: [220, 220, 220],

        lineWidth: 0.2,

        valign: "middle"

    },


    headStyles: {

        fillColor: [75, 75, 75],

        textColor: [255, 255, 255],

        fontStyle: "bold",

        fontSize: 8,

        cellPadding: 2.5,

        halign: "center"

    },


    /*
     * --------------------------------------------------
     * Spaltenbreiten
     * --------------------------------------------------
     *
     * Gesamtbreite: 184 mm
     *
     * A4 = 210 mm
     * Rand links/rechts = 12 mm
     * verfügbar = 186 mm
     *
     */

    columnStyles: {

        // Bauteil
        0: {
            cellWidth: 42
        },

        // Anzahl
        1: {
            cellWidth: 10,
            halign: "center"
        },

        // Länge
        2: {
            cellWidth: 15,
            halign: "center"
        },

        // Breite
        3: {
            cellWidth: 15,
            halign: "center"
        },

        // Stärke
        4: {
            cellWidth: 13,
            halign: "center"
        },

        // Material
        5: {
            cellWidth: 32
        },

        // Kantenmaterial
        6: {
            cellWidth: 49
        },

        // Kanten-Skizze
        7: {
            cellWidth: 8,
            halign: "center"
        }

    },


    /*
     * --------------------------------------------------
     * Zellen formatieren
     * --------------------------------------------------
     */

    didParseCell: function (data) {

        const row = rows[data.row.index];


        /*
         * Parent
         */

        if (
            data.section === "body" &&
            row?.type === "parent"
        ) {

            data.cell.styles.fillColor = [
                232,
                232,
                232
            ];

            data.cell.styles.fontStyle = "bold";

            data.cell.styles.textColor = [
                45,
                45,
                45
            ];

        }


        /*
         * Children
         */

        if (
            data.section === "body" &&
            row?.type === "child"
        ) {

            data.cell.styles.fillColor = [
                250,
                250,
                250
            ];

        }


        /*
         * Kantenmaterial etwas kleiner darstellen
         */

        if (
            data.section === "body" &&
            data.column.index === 6
        ) {

            data.cell.styles.fontSize = 7;

        }

    },


    /*
     * --------------------------------------------------
     * Kanten-Skizze zeichnen
     * --------------------------------------------------
     */

    didDrawCell: function (data) {

        if (
            data.section !== "body" ||
            data.column.index !== 7
        ) {
            return;
        }


        const row = rows[data.row.index];


        /*
         * Nur Children haben eine Kanten-Skizze
         */

        if (
            row?.type !== "child" ||
            !row.item
        ) {
            return;
        }


        const cell = data.cell;


        /*
         * Kleine Skizze
         */

        const maxSize = 6;

        const padding = 1.5;


        const size = Math.min(

            maxSize,

            cell.width - padding * 2,

            cell.height - padding * 2

        );


        const x =
            cell.x +
            (cell.width - size) / 2;


        const y =
            cell.y +
            (cell.height - size) / 2;


        drawEdgeSketch(

            doc,

            row.item,

            x,

            y,

            size

        );

    }


    });


    /*
     * --------------------------------------------------
     * PDF speichern
     * --------------------------------------------------
     */

    doc.save("Teileliste.pdf");

}