import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import xml2js from "xml2js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const xmlPath = path.join(__dirname, "data//tours.xml");
const bookingsXmlPath = path.join(__dirname, "data//bookings.xml");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); 


let tours = [];
let bookings = [];
let bookingIdCounter = 0;


function loadToursFromXML() {
  if (!fs.existsSync(xmlPath)) {
    console.error("tours.xml not found at", xmlPath);
    return;
  }

  const xml = fs.readFileSync(xmlPath, "utf-8");

  xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
    if (err) {
      console.error("Error parsing tours.xml:", err);
      return;
    }

    try {
      const rawTours = result.tours?.tour || [];
      const tourList = Array.isArray(rawTours) ? rawTours : [rawTours];

      tours = tourList.map((t) => {
        const launchesRaw = t.launches?.launch || [];
        const launchList = Array.isArray(launchesRaw) ? launchesRaw : [launchesRaw];

        return {
          id: parseInt(t.id),
          operator: t.operator,
          price: parseFloat(t.price),
          image: t.image,
          location: {
            lat: parseFloat(t.location.lat),
            lng: parseFloat(t.location.lng),
          },
          launches: launchList.map((l) => ({
            time: l.time,
            capacity: parseInt(l.capacity),
          })),
        };
      });

      console.log("Loaded tours from XML:", tours.length, "tours");
    } catch (e) {
      console.error("Error processing tours data:", e);
    }
  });
}

function saveToursToXML() {
  const builder = new xml2js.Builder();

  const toursToSave = tours.map(t => ({
    id: t.id,
    operator: t.operator,
    price: t.price,
    image: t.image,
    location: {
      lat: t.location.lat,
      lng: t.location.lng
    },
    launches: {
      launch: t.launches.map(l => ({
        time: l.time,
        capacity: l.capacity
      }))
    }
  }));

  const xml = builder.buildObject({ tours: { tour: toursToSave } });
  fs.writeFileSync(xmlPath, xml);
}

function loadBookingsFromXML() {
  if (!fs.existsSync(bookingsXmlPath)) {
    console.warn("bookings.xml not found at", bookingsXmlPath);
    return;
  }

  const xml = fs.readFileSync(bookingsXmlPath, "utf-8");

  xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
    if (err) {
      console.error("Error parsing bookings.xml:", err);
      return;
    }

    try {
      const raw = result.bookings?.booking;
      const bookingList = Array.isArray(raw) ? raw : raw ? [raw] : [];

      bookings = bookingList.map((b) => ({
        id: parseInt(b.id),
        name: b.name || "",
        partySize: parseInt(b.partySize) || 0,
        tourId: parseInt(b.tourId),
        time: b.time || "",
        operator: b.operator || "",
      }));

      bookings.forEach((booking) => {
        if (booking.id > bookingIdCounter) bookingIdCounter = booking.id;
      });

      console.log("Loaded bookings from XML:", bookings.length, "records");
    } catch (e) {
      console.error("Error processing bookings data:", e);
    }
  });
}

function saveBookingsToXML() {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ bookings: { booking: bookings } });
  fs.writeFileSync(bookingsXmlPath, xml);
}


app.get("/api/tours", (req, res) => {
  console.log("get ", tours.length, "tours");
  res.json(tours);
});


app.post("/api/bookings", (req, res) => {
  const { name, partySize, tourId, time } = req.body;
  if (!name || !partySize || !tourId || !time) {
    return res.status(400).json({ error: "Missing booking data" });
  }

  const tour = tours.find((t) => t.id === tourId);
  if (!tour) return res.status(404).json({ error: "Tour not found" });

  const launch = tour.launches.find((l) => l.time === time);
  if (!launch) return res.status(404).json({ error: "Launch time not found" });

  if (launch.capacity < partySize) {
    return res.status(400).json({ error: "Not enough capacity" });
  }

  launch.capacity -= partySize;
  saveToursToXML();

  const newBooking = {
    id: ++bookingIdCounter,
    name,
    partySize,
    tourId,
    time,
    operator: tour.operator,
  };

  bookings.push(newBooking);
  saveBookingsToXML();

  res.status(201).json(newBooking);
});


app.get("/api/bookings/:id", (req, res) => {
  const booking = bookings.find((b) => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});


app.delete("/api/bookings/:id", (req, res) => {
  const bookingIndex = bookings.findIndex((b) => b.id === parseInt(req.params.id));
  if (bookingIndex === -1) return res.status(404).json({ error: "Booking not found" });

  const booking = bookings[bookingIndex];

  const tour = tours.find((t) => t.id === booking.tourId);
  const launch = tour.launches.find((l) => l.time === booking.time);
  launch.capacity += booking.partySize;

  bookings.splice(bookingIndex, 1);

  saveToursToXML();
  saveBookingsToXML();

  res.json({ message: "Booking cancelled", ...booking });
});



loadBookingsFromXML();
loadToursFromXML();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});