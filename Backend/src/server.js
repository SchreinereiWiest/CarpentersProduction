
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://app.localhost",
  credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

// user login und reauthorize
app.use("/auth", authRoutes);

app.use("/customers", customerRoutes);

app.use("/projects", projectRoutes);

app.use("/files", fileRoutes);

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});



















// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'projects/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, file.originalname); // exakt Originalname
//   }
// });

// const upload = multer({ storage });

// app.use(express.json());
// app.use(cors({
//   origin: "http://localhost:5173"
// }));


// // API Endpunkte


// // Upload eines Projekts (tar-Datei)
// app.post("/uploadFile", upload.single("file"), (req, res) => {
//   console.log("FILE:", req.file);
//   console.log("BODY:", req.body);
//   res.send("File uploaded successfully!");
// });


// // Download einer Datei aus einem Projekt
// app.get("/project/File", (req, res) => {
//   const fileName = req.query.id; // z.B. ?name=test.pdf
//   const fileSearchName = req.query.name; // z.B. ?name=test.pdf

//   // console.log("Anfrage für Datei:", fileName, "und Suche nach:", fileSearchName);

//   const extract = tar.extract();
//   const filePath = path.join(__dirname, "projects", fileName);
//   const stream = fs.createReadStream(filePath);

//   let found = false;

//   extract.on("entry", (header, streamEntry, next) => {
//     if (header.name === fileSearchName) {
//       found = true;

//       res.setHeader("Content-Disposition", `inline; filename="${fileSearchName}"`);

//       streamEntry.pipe(res);

//       streamEntry.on("end", () => {
//         next();
//       });
//     } else {
//       // skip andere Dateien
//       streamEntry.resume();
//       streamEntry.on("end", next);
//     }
//   });

//   extract.on("finish", () => {
//     if (!found) {
//       res.status(404).send("Datei nicht gefunden");
//     }
//   });

//   stream.pipe(extract);
// });


// app.get("/project/content", async (req, res) => {
//   const fileName = req.query.id;        // z.B. project.tar
//   const fileSearchName = req.query.name; // z.B. CP/Platten.json

//   try {
//     const extract = tar.extract();

//     const filePath = path.join(process.cwd(), "projects", fileName);
//     const stream = fs.createReadStream(filePath);

//     let raw = "";
//     let found = false;

//     // 1. TAR durchsuchen
//     extract.on("entry", (header, streamEntry, next) => {
//       if (header.name === fileSearchName) {
//         found = true;

//         streamEntry.on("data", (chunk) => {
//           raw += chunk.toString();
//         });

//         streamEntry.on("end", () => next());
//       } else {
//         streamEntry.resume();
//         streamEntry.on("end", next);
//       }
//     });

//     // 2. Wenn TAR fertig gelesen ist
//     extract.on("finish", () => {
//       if (!found) {
//         return res.status(404).json({ error: "Datei nicht im TAR gefunden" });
//       }

//       try {
//         // 3. trailing comma fixen
//         raw = raw.replace(/,\s*]/, "]");

//         // 4. JSON parsen
//         const data = JSON.parse(raw);

//         // 5. helper
//         const toFloat = (val) => {
//           // if (!val) return null;
//           return parseFloat(val.toString().replace(",", "."));
//         };

//   const groups = {};
  
  
//   data.forEach(item => {

//   const parentID = item.PID.substring(0, 3);
//   const childID = item.PID.substring(3, 6);

//   // Hauptgruppe erzeugen
//   if (!groups[parentID]) {
//     groups[parentID] = null;
//   }

//   // Hauptelement
//   if (childID === "000") {

//     groups[parentID] = {
//       ...item,
//       L: toFloat(item.L),
//             B: toFloat(item.B),
//             T: toFloat(item.T),
//             X: toFloat(item.X),
//             Y: toFloat(item.Y),
//             Z: toFloat(item.Z),
//             RX: toFloat(item.RX),
//             RY: toFloat(item.RY),
//             RZ: toFloat(item.RZ),
//             OX: toFloat(item.OX),
//             OY: toFloat(item.OY),
//             OZ: toFloat(item.OZ),
//       Children: []
//     };

//   } else {

//     // Falls Hauptobjekt noch nicht existiert
//     if (!groups[parentID]) {

//       groups[parentID] = {
//         PID: parentID + "000",
//         Children: []
//       };

//     }

//     groups[parentID].Children.push({...item,
//       L: toFloat(item.L),
//             B: toFloat(item.B),
//             T: toFloat(item.T),
//             X: toFloat(item.X),
//             Y: toFloat(item.Y),
//             Z: toFloat(item.Z),
//             RX: toFloat(item.RX),
//             RY: toFloat(item.RY),
//             RZ: toFloat(item.RZ),
//             OX: toFloat(item.OX),
//             OY: toFloat(item.OY),
//             OZ: toFloat(item.OZ),});
//   }

// });

// const result = Object.values(groups);

// res.json(result);


//       } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "JSON Fehler" });
//       }
//     });

//     // stream starten
//     stream.pipe(extract);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server Fehler" });
//   }
// });



// // API zum Abrufen der Projektliste
// app.get("/project/Count", (req, res) => {
//   const dirPath = path.join(__dirname, "projects");

//   fs.readdir(dirPath, (err, files) => {
//     if (err) {
//       return res.status(500).send("Fehler");
//     }

//     const tarFiles = files
//       .filter(file => file.endsWith(".tar"))
//       .map((file, index) => ({
//         id: file,      // stabil!
//         index: index   // optional
//       }));

//     res.json(tarFiles);
//   });
// });


// // API zum Abrufen der Bilderliste eines Projekts
// app.get("/project/imageList", (req, res) => {
//   const projectId = req.query.id; // z.B. a.tar

//   const extract = tar.extract();
//   const filePath = path.join(__dirname, "projects", projectId);
//   const stream = fs.createReadStream(filePath);

//   const images = [];
//   let index = 0;

//   extract.on("entry", (header, streamEntry, next) => {
//     if (header.name.startsWith("Bilder/")) {

//       if (!header.name.endsWith("/")) {

//         const fileName = path.basename(header.name);

//         images.push({
//           id: fileName,
//           path: header.name,
//           index: index++
//         });
//       }
//     }

//     // immer weiter im Stream
//     streamEntry.resume();
//     streamEntry.on("end", next);
//   });

//   extract.on("finish", () => {
//     res.json(images);
//   });

//   extract.on("error", (err) => {
//     console.error(err);
//     res.status(500).send("Fehler beim Lesen des TAR");
//   });

//   stream.pipe(extract);
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

