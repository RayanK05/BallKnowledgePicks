const pg = require("pg");
const db = require("./db"); // your shared Pool

function createEventListener(io) {
  const dbConfig = {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  };

  let timer = null;
  let stopped = false;

  const broadcast = (groupId, data) =>
    io.to(`group_${groupId}`).emit("groupUpdate", data);

  async function start() {
    const listener = new pg.Client(dbConfig);
    let scheduled = false;

    const reconnect = () => {
      if (scheduled || stopped) return;
      scheduled = true;
      listener.end().catch(() => {}); // clean up the dead client
      console.log("Reconnecting PostgreSQL listener in 5 seconds...");
      timer = setTimeout(start, 5000);
    };

    listener.on("error", (err) => {
      console.error("Listener error:", err.message);
      reconnect();
    });
    listener.on("end", reconnect);

    listener.on("notification", async (msg) => {
      try {
        const event = JSON.parse(msg.payload);

        // someone submitted or changed a pick (delete this block if you dropped that trigger)
        if (event.type === "prediction") {
          const { rows } = await db.query(
            "SELECT group_id FROM group_members WHERE user_id = $1",
            [event.user_id]
          );
          rows.forEach((r) =>
            broadcast(r.group_id, { type: "picks_changed", gameId: event.game_id })
          );
        }

        // a game finished, so scores changed
        if (event.type === "game_final") {
          const { rows } = await db.query(
            `SELECT DISTINCT gm.group_id
             FROM group_members gm
             JOIN predictions p ON p.user_id = gm.user_id
             WHERE p.game_id = $1`,
            [event.game_id]
          );
          rows.forEach((r) =>
            broadcast(r.group_id, { type: "leaderboard_changed", gameId: event.game_id })
          );
        }
      } catch (err) {
        console.error("Notification handler failed:", err);
      }
    });

    try {
      await listener.connect();
      await listener.query("LISTEN db_events");
      console.log("Listening for PostgreSQL events...");
    } catch (err) {
      console.error("Listener connection failed:", err.message);
      reconnect();
    }
  }

  return {
    start,
    stop: () => { stopped = true; clearTimeout(timer); },
  };
}

module.exports = createEventListener;