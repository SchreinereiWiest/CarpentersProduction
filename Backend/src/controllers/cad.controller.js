import prisma from "../config/prisma.js";






app.get("/project/content", async (req, res) => {
  const fileName = req.query.id;        // z.B. project.tar
  const fileSearchName = req.query.name; // z.B. CP/Platten.json

  try {
    const extract = tar.extract();

    const filePath = path.join(process.cwd(), "projects", fileName);
    const stream = fs.createReadStream(filePath);

    let raw = "";
    let found = false;

    // 1. TAR durchsuchen
    extract.on("entry", (header, streamEntry, next) => {
      if (header.name === fileSearchName) {
        found = true;

        streamEntry.on("data", (chunk) => {
          raw += chunk.toString();
        });

        streamEntry.on("end", () => next());
      } else {
        streamEntry.resume();
        streamEntry.on("end", next);
      }
    });

    // 2. Wenn TAR fertig gelesen ist
    extract.on("finish", () => {
      if (!found) {
        return res.status(404).json({ error: "Datei nicht im TAR gefunden" });
      }

      try {
        // 3. trailing comma fixen
        raw = raw.replace(/,\s*]/, "]");

        // 4. JSON parsen
        const data = JSON.parse(raw);

        // 5. helper
        const toFloat = (val) => {
          // if (!val) return null;
          return parseFloat(val.toString().replace(",", "."));
        };

  const groups = {};
  
  
  data.forEach(item => {

  const parentID = item.PID.substring(0, 3);
  const childID = item.PID.substring(3, 6);

  // Hauptgruppe erzeugen
  if (!groups[parentID]) {
    groups[parentID] = null;
  }

  // Hauptelement
  if (childID === "000") {

    groups[parentID] = {
      ...item,
      L: toFloat(item.L),
            B: toFloat(item.B),
            T: toFloat(item.T),
            X: toFloat(item.X),
            Y: toFloat(item.Y),
            Z: toFloat(item.Z),
            RX: toFloat(item.RX),
            RY: toFloat(item.RY),
            RZ: toFloat(item.RZ),
            OX: toFloat(item.OX),
            OY: toFloat(item.OY),
            OZ: toFloat(item.OZ),
      Children: []
    };

  } else {

    // Falls Hauptobjekt noch nicht existiert
    if (!groups[parentID]) {

      groups[parentID] = {
        PID: parentID + "000",
        Children: []
      };

    }

    groups[parentID].Children.push({...item,
      L: toFloat(item.L),
            B: toFloat(item.B),
            T: toFloat(item.T),
            X: toFloat(item.X),
            Y: toFloat(item.Y),
            Z: toFloat(item.Z),
            RX: toFloat(item.RX),
            RY: toFloat(item.RY),
            RZ: toFloat(item.RZ),
            OX: toFloat(item.OX),
            OY: toFloat(item.OY),
            OZ: toFloat(item.OZ),});
  }

});

const result = Object.values(groups);

res.json(result);


      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "JSON Fehler" });
      }
    });

    // stream starten
    stream.pipe(extract);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Fehler" });
  }
});