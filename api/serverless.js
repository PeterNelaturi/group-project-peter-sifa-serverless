import { promises as fs } from "fs";
import path from "path";
import xml2js from "xml2js";

let tours = [];
let bookings = [];
let bookingIdCounter = 0;

const xmlPath = path.join(process.cwd(), "data", "tours.xml");
const bookingsXmlPath = path.join(process.cwd(), "data", "bookings.xml");

async function loadToursFromXML() {
try {
const xml = await fs.readFile(xmlPath, "utf-8");
const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
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
} catch (e) {
    console.error("Error loading tours.xml:", e);
}


}

async function saveToursToXML() {
const builder = new xml2js.Builder();
const toursToSave = tours.map(t => ({
id: t.id,
operator: t.operator,
price: t.price,
image: t.image,
location: t.location,
launches: { launch: t.launches }
}));
const xml = builder.buildObject({ tours: { tour: toursToSave } });
await fs.writeFile(xmlPath, xml);
}

async function loadBookingsFromXML() {
try {
if (!(await fs.stat(bookingsXmlPath).catch(() => false))) return;
const xml = await fs.readFile(bookingsXmlPath, "utf-8");
const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
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
bookings.forEach((b) => { if (b.id > bookingIdCounter) bookingIdCounter = b.id; });
} catch (e) {
console.error("Error loading bookings.xml:", e);
}
}

async function saveBookingsToXML() {
const builder = new xml2js.Builder();
const xml = builder.buildObject({ bookings: { booking: bookings } });
await fs.writeFile(bookingsXmlPath, xml);
}

export default async function handler(req, res) {
// Load data on each function call
await loadToursFromXML();
await loadBookingsFromXML();


const { method, url } = req;

if (url === "/api/tours" && method === "GET") {
    res.status(200).json(tours);
    return;
}

if (url === "/api/bookings" && method === "POST") {
    const body = await new Promise((resolve) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(JSON.parse(data)));
    });

    const { name, partySize, tourId, time } = body;
    if (!name || !partySize || !tourId || !time) {
        res.status(400).json({ error: "Missing booking data" });
        return;
    }

    const tour = tours.find(t => t.id === tourId);
    if (!tour) { res.status(404).json({ error: "Tour not found" }); return; }

    const launch = tour.launches.find(l => l.time === time);
    if (!launch) { res.status(404).json({ error: "Launch time not found" }); return; }

    if (launch.capacity < partySize) { res.status(400).json({ error: "Not enough capacity" }); return; }

    launch.capacity -= partySize;
    await saveToursToXML();

    const newBooking = { id: ++bookingIdCounter, name, partySize, tourId, time, operator: tour.operator };
    bookings.push(newBooking);
    await saveBookingsToXML();

    res.status(201).json(newBooking);
    return;
}

if (url.startsWith("/api/bookings/") && method === "GET") {
    const id = parseInt(url.split("/")[3]);
    const booking = bookings.find(b => b.id === id);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.status(200).json(booking);
    return;
}

if (url.startsWith("/api/bookings/") && method === "DELETE") {
    const id = parseInt(url.split("/")[3]);
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) { res.status(404).json({ error: "Booking not found" }); return; }

    const booking = bookings[index];
    const tour = tours.find(t => t.id === booking.tourId);
    const launch = tour.launches.find(l => l.time === booking.time);
    launch.capacity += booking.partySize;

    bookings.splice(index, 1);
    await saveToursToXML();
    await saveBookingsToXML();

    res.status(200).json({ message: "Booking cancelled", ...booking });
    return;
}

res.status(404).json({ error: "Endpoint not found" });


}
