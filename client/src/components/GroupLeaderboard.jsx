import { useCallback, useEffect, useRef, useState } from "react";
import { useGroupSocket } from "../useGroupSocket";

function GroupLeaderboard({ groupId }) {
  const [rows, setRows] = useState([]);
  const timer = useRef();

  const load = useCallback(async () => {
    if (!groupId) return; // do nothing until we have a real id

    const res = await fetch(`/api/groups/${Number(groupId)}/leaderboard`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) {
        const data = await res.json();
        setRows(data);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  useGroupSocket(groupId, (msg) => {
    if (["leaderboard_changed", "picks_changed", "connected"].includes(msg.type)) {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, 300); // combine bursts into one refetch
    }
  });

  return (
    <ul>
      {rows.map((r) => (
        <li key={r.user_id}>{r.username}: {r.user_score}</li>
      ))}
    </ul>
  );
}

export default GroupLeaderboard;