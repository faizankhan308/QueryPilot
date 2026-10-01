import app from "./src/app.js";

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`QueryPilot Node.js server listening on http://127.0.0.1:${PORT}`);
});
