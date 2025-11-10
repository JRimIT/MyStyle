// routes/imageproxy.route.js
import express from "express";
import axios from "axios";
import https from "https";

const router = express.Router();
const agent = new https.Agent({ rejectUnauthorized: false });

router.get("/img", async (req, res) => {
  try {
    const url = (req.query.url || "").toString();
    if (!/^https?:\/\//i.test(url)) return res.status(400).send("Invalid url");

    const response = await axios.get(url, {
      responseType: "stream",
      httpsAgent: agent,
      headers: { "User-Agent": "MyStyle-ImgProxy/1.0" },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      return res.status(502).send("Bad upstream");
    }

    const ct = response.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=3600");
    response.data.pipe(res);
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

export default router;

