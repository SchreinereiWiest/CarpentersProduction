import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable'

export function createPartsListPDF(processedContent) {

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    // Überschrift
    doc.setFontSize(18);
    doc.text("Teileliste", 15, 15);

    doc.setFontSize(10);
    doc.text(
        `Erstellt am: ${new Date().toLocaleDateString("de-DE")}`,
        15,
        22
    );

    // Daten aus processedContent in Tabellenzeilen umwandeln
    const rows = [];

    processedContent.forEach(item => {

        // Objekt selbst
        rows.push([
            item.Objektname,
            item.Anzahl,
            item.L,
            item.B,
            item.T,
            item.MID || ""
        ]);

        // Children
        (item.Children || []).forEach(child => {

            rows.push([
                `   ${child.Objektname}`,
                child.Anzahl,
                child.L,
                child.B,
                child.T,
                child.MID || ""
            ]);

        });

    });

    autoTable(doc, {

        startY: 28,

        head: [[
            "Bauteil",
            "Anzahl",
            "L",
            "B",
            "T",
            "Material"
        ]],

        body: rows,

        styles: {
            fontSize: 9,
            cellPadding: 2
        },

        headStyles: {
            fontSize: 9
        },

        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 20 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 50 }
        },

        margin: {
            left: 15,
            right: 15
        }
    });

    // PDF öffnen
    doc.save("Teileliste.pdf");
}