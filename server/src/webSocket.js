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
            broadcast(r.group_id, { 
                type: "picks_changed",
                gameId: event.game_id,
                userId: event.user_id,
                username: event.username,
                operation: event.operation,
            })
          );
        }

        if (event.type === "score") {
            // every group this user belongs to gets told
            const { rows } = await db.query(
            "SELECT group_id FROM group_members WHERE user_id = $1",
            [event.user_id]
            );

            rows.forEach((r) =>
            broadcast(r.group_id, {
                type: "leaderboard_changed",
                userId: event.user_id,
                userScore: event.user_score,
            })
            );
        }

        if (event.type === "group_member") {
            const room = `group_${event.group_id}`;

            // tell everyone currently in the group
            broadcast(event.group_id, {
                type: "members_changed",
                operation: event.operation,   // 'INSERT' or 'DELETE'
                userId: event.user_id,
                username: event.username,
            });

            if (event.operation === "DELETE") {
                for (const [, socket] of io.sockets.sockets) {
                    if (socket.userId === event.user_id) {
                        socket.emit("groupUpdate", { type: "left_group", groupId: event.group_id });
                        socket.leave(room);
                    }
                }
            }
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