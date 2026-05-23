import express from "express";
import cors from "cors";
import http from "http";
import { server as WebSocketServer } from "websocket";

const app = express();
app.use(cors());

// -----------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------

const films = [
  { id: 1, title: "Inception", genre: "sci-fi", ratings: [], reviews: [] },
  { id: 2, title: "The Godfather", genre: "drama", ratings: [], reviews: [] },
  { id: 3, title: "Spirited Away", genre: "animation", ratings: [], reviews: [] },
];

// next film id
let nextId = 4;

const connections = [];

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

// parses the body of a request as JSON and calls callback with it
// if it's not valid JSON, sends a 400 and doesn't call the callback
const parseBody = (req, res, callback) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(...chunk));
  req.on("end", () => {
    const raw = String.fromCharCode(...chunks);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      res.status(400).send("Body must be valid JSON");
      return;
    }
    callback(parsed);
  });
};

const checkFields = (body, fields) => {
  for (const field of fields) {
    if (!(field in body)) return false;
  }
  return true;
};

function broadcastToAll(data) {
  const message = JSON.stringify(data);
  for (let i = 0; i < connections.length; i++) {
    connections[i].send(message);
  }
}

// -----------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------

// GET /films — return all films
// optionally filter by genre: GET /films?genre=sci-fi
app.get("/films", (req, res) => {
  if (req.query.genre) {
    const filtered = films.filter((f) => f.genre === req.query.genre);
    res.json(filtered);
    return;
  }
  res.json(films);
});

// GET /films/:id — return a single film
app.get("/films/:id", (req, res) => {
  const film = films.find((f) => f.id == req.params.id);
  if (!film) {
    res.status(404).send("Film not found");
    return;
  }
  res.json(film);
});

// POST /films — add a new film
app.post("/films", (req, res) => {
  parseBody(req, res, (body) => {
    if (!checkFields(body, ["title", "genre"])) {
      res.status(400).send("Expected fields: title, genre");
      return;
    }
    const film = {
      id: nextId,
      title: body.title,
      genre: body.genre,
      ratings: [],
      reviews: [],
    };
    nextId = nextId + 1;
    films.push(film);
    broadcastToAll({ type: "new-film", film });
    res.json({ ok: true, id: film.id });
  });
});

// POST /films/:id/rate — rate a film 1-5
app.post("/films/:id/rate", (req, res) => {
  parseBody(req, res, (body) => {
    const film = films.find((f) => f.id == req.params.id);

    if (!film) {
      res.status(404).send("Film not found");
      return;
    }

    if (!("rating" in body)) {
      res.status(400).send("Expected field: rating");
      return;
    }

    if (body.rating < 1 || body.rating > 5) {
      res.status(400).send("Rating must be between 1 and 5");
      return;
    }

    film.ratings.push(body.rating);

    const avg = film.ratings.reduce((a, b) => a + b, 0) / film.ratings.length;

    broadcastToAll({
      type: "rating-update",
      filmId: film.id,
      average: avg,
      total: film.ratings.length,
    });

    res.json({ ok: true, average: avg });
  });
});

// POST /films/:id/review — add a text review
app.post("/films/:id/review", (req, res) => {
  parseBody(req, res, (body) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(...chunk));
    req.on("end", () => {
      const film = films.find((f) => f.id == req.params.id);

      if (!film) {
        res.status(404).send("Film not found");
        return;
      }

      if (!checkFields(body, ["author", "text"])) {
        res.status(400).send("Expected fields: author, text");
        return;
      }

      if (body.text.length > 500) {
        res.status(400).send("Review must be under 500 characters");
        return;
      }

      const review = {
        id: film.reviews.length,
        author: body.author,
        text: body.text,
        ts: Date.now(),
      };

      film.reviews.push(review);

      broadcastToAll({
        command: "new-review",
        data: { filmId: film.id, review },
      });

      res.json({ ok: true });
    });
  });
});

// DELETE /films/:id — remove a film
app.delete("/films/:id", (req, res) => {
  parseBody(req, res, (body) => {
    const idx = films.findIndex((f) => f.id == req.params.id);
    if (idx === -1) {
      res.status(404).send("Film not found");
      return;
    }
    films.splice(idx, 1);
    res.json({ ok: true });
  });
});

// GET /stats — overall stats
app.get("/stats", (req, res) => {
  parseBody(req, res, (body) => {
    const totalRatings = films.reduce((sum, f) => sum + f.ratings.length, 0);
    const totalReviews = films.reduce((sum, f) => sum + f.reviews.length, 0);
    res.json({ films: films.length, totalRatings, totalReviews });
  });
});

// -----------------------------------------------------------------------
// WebSocket server
// -----------------------------------------------------------------------

const server = http.createServer(app);
const wsServer = new WebSocketServer({ httpServer: server });

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connections.push(connection);

  // send current film list as soon as client connects
  connection.send(
    JSON.stringify({
      type: "init",
      films,
    })
  );

  connection.on("message", (message) => {
    if (message.type !== "utf8") return;

    let data;
    try {
      data = JSON.parse(message.utf8Data);
    } catch {
      connection.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // clients can send a rating over the WebSocket instead of HTTP
    if (data.type === "rate") {
      const film = films.find((f) => f.id === data.filmId);
      if (!film) {
        connection.send(JSON.stringify({ type: "error", message: "Film not found" }));
        return;
      }
      film.ratings.push(data.rating);
      const avg = film.ratings.reduce((a, b) => a + b, 0) / film.ratings.length;
      broadcastToAll({
        type: "rating-update",
        filmId: film.id,
        average: avg,
        total: film.ratings.length,
      });
    }
  });

  connection.on("close", () => {
    const idx = connections.indexOf(connection);
    if (idx !== -1) connections.splice(idx, 1);
  });
});

// -----------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.error(`Film rater listening on port ${port}`);
});
