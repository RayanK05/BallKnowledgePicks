import { useCallback, useEffect, useRef, useState } from "react";
import { useGroupSocket } from "../useGroupSocket";
import { Navigate } from "react-router-dom";

function GroupLeaderboard({ groupId }) {
  const [rows, setRows] = useState([]);
  const timer = useRef();

  const load = useCallback(async () => {
    if (!groupId) {
        setRows([]);
        return;
    }   // do nothing until we have a real id

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

    if (msg.type === "picks_changed") {
           alert(`${msg.username} made a new prediction.`);
        }

    if (msg.type === "left_group" || msg.type === "group_deleted") {
        // this user was removed, so send them back to their group list
        if (msg.type === "group_deleted") {
            alert(`Group ${msg.groupId} has been deleted.`)
        }
        else{
            alert(`User ${msg.user_id} has left group ${msg.groupId}.`)
        }
        return;
    }
    

    if (["leaderboard_changed", "picks_changed", "members_changed","connected"].includes(msg.type)) { //need live updates on join and leave
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