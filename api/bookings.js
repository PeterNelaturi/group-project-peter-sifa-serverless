import { promises as fs } from "fs";
import path from "path";
import xml2js from "xml2js";

const xmlPath = path.join(process.cwd(), "data", "tours.xml");
const bookingsXmlPath = path.join(process.cwd(), "data", "bookings.xml");

let bookingIdCounter = 0;

async function loadTours() {
try {
const xml = await fs.readFile(xmlPath, "utf-8");
const result = await xml2js.parseStringPromise(xml, { explicitArray: false });

return result.tours.tour.map(t => ({  
  id: t.id,  
  operator: t.operator,  
  price: parseFloat(t.price),  
  image: t.image,  
  location: {  
    lat: parseFloat(t.location.lat),  
    lng: parseFloat(t.location.lng)  
  },  
  launches: Array.isArray(t.launches.launch)  
    ? t.launches.launch.map(l => ({ time: l.time, capacity: parseInt(l.capacity) }))  
    : [{ time: t.launches.launch.time, capacity: parseInt(t.launches.launch.capacity) }]  
}));  

} catch (err) {
console.error("Error loading tours:", err);
return [];
}
}

async function loadBookings() {
try {
if (!(await fs.stat(bookingsXmlPath).catch(() => false))) return [];
const xml = await fs.readFile(bookingsXmlPath, "utf-8");
const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
const raw = result.bookings?.booking;
const bookingList = Array.isArray(raw) ? raw : raw ? [raw] : [];
bookingList.forEach(b => { if (b.id > bookingIdCounter) bookingIdCounter = parseInt(b.id); });
return bookingList;
} catch { return []; }
}

async function saveBookings(bookings) {
const builder = new xml2js.Builder();
const xml = builder.buildObject({ bookings: { booking: bookings } });
await fs.writeFile(bookingsXmlPath, xml);
}

export default async function handler(req, res) {
if (req.method === "POST") {
const tours = await loadTours();
const bookings = await loadBookings();

const body = await new Promise(resolve => {  
  let data = "";  
  req.on("data", chunk => data += chunk);  
  req.on("end", () => resolve(JSON.parse(data)));  
});  

const { name, partySize, tourId, time } = body;  
if (!name || !partySize || !tourId || !time)  
  return res.status(400).json({ error: "Missing data" });  

const tour = tours.find(t => parseInt(t.id) === parseInt(tourId));  
if (!tour) return res.status(404).json({ error: "Tour not found" });  

const launch = tour.launches.find(l => l.time.trim() === time.trim());  
if (!launch) return res.status(404).json({ error: "Launch not found" });  
if (launch.capacity < partySize) return res.status(400).json({ error: "Not enough capacity" });  

launch.capacity -= partySize;  

const newBooking = {  
  id: ++bookingIdCounter,  
  name,  
  partySize,  
  tourId,  
  time,  
  operator: tour.operator  
};  

bookings.push(newBooking);  
await saveBookings(bookings);  

res.status(201).json(newBooking);  

} else {
res.status(405).json({ error: "Method not allowed" });
}
}