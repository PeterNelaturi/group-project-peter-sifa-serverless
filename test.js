import http from "http";
import handler from "./api/serverless.js";

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(3000, () => {
  console.log("Serverless function running locally at http://localhost:3000");
});