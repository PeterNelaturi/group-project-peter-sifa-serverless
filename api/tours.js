import { promises as fs } from "fs";
import path from "path";
import xml2js from "xml2js";

const xmlPath = path.join(process.cwd(), "data", "tours.xml");

async function loadTours() {
  const xml = await fs.readFile(xmlPath, "utf-8");
  const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
  const rawTours = result.tours?.tour || [];
  const tourList = Array.isArray(rawTours) ? rawTours : [rawTours];

  return tourList.map((t) => {
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
}

export default async function handler(req, res) {
  const tours = await loadTours();
  res.status(200).json(tours);
}
