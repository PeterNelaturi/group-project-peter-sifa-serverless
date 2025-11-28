import { promises as fs } from "fs";
import path from "path";
import xml2js from "xml2js";

const bookingsXmlPath = path.join(process.cwd(), "data", "bookings.xml");

async function loadBookings() {
  if (!(await fs.stat(bookingsXmlPath).catch(() => false))) return [];
  const xml = await fs.readFile(bookingsXmlPath, "utf-8");
  const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
  const raw = result.bookings?.booking;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

async function saveBookings(bookings) {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ bookings: { booking: bookings } });
  await fs.writeFile(bookingsXmlPath, xml);
}

export default async function handler(req, res) {
  const { id } = req.query;
  const bookingId = parseInt(id);
  let bookings = await loadBookings();
  const index = bookings.findIndex(b => parseInt(b.id) === bookingId);

  if (index === -1) return res.status(404).json({ error: "Booking not found" });

  if (req.method === "GET") {
    return res.status(200).json(bookings[index]);
  }

  if (req.method === "DELETE") {
    bookings.splice(index, 1);
    await saveBookings(bookings);
    return res.status(200).json({ message: "Booking deleted" });
  }

  res.status(405).json({ error: "Method not allowed" });
}
