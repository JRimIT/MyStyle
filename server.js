// server.js
import express from "express";
import cartRoutes from "./routes/cart.routes.js";

const app = express();

app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.originalUrl);
  next();
});

app.get("/", (req, res) => res.send("OK /"));

app.use("/api/cart", cartRoutes);

app.use((req, res) => res.status(404).send("Not Found"));

const PORT = 3000;
app.listen(PORT, () => console.log("Server listening on http://localhost:" + PORT));
