import { useCallback, useEffect, useRef, useState } from "react";
import { useGroupSocket } from "../useGroupSocket";
import { Navigate } from "react-router-dom";

function GroupLeaderboard({ groupId, handleGroupUpdate }) {
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

    if (msg.type === "group_deleted" || msg.type === "left_group") {
        handleGroupUpdate(msg);
    }

    if (["leaderboard_changed", "picks_changed", "members_changed","connected"].includes(msg.type)) { //need live updates on join and leave
        clearTimeout(timer.current);
        timer.current = setTimeout(load, 300); // combine bursts into one refetch
    }
  });

  return (
    <div className="leaderboard-content">
        <table className="leaderboard-table">
            <thead>
                <tr>
                    <th className="rank">Rank</th>
                    <th>Member</th>
                    <th>Accuracy</th>
                    <th className="score">Score</th>
                </tr>
            </thead>

            <tbody>
                {rows.map((r, index) => (
                    <tr key={r.user_id}>
                        <td className="rank">#{index + 1}</td>
                        <td>{r.username}</td>
                        <td>{r.accuracy_percentage}%</td>
                        <td className="score">{r.user_score}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {rows.length === 0 && (
            <p className="empty-state">No members found in this group.</p>
        )}
    </div>
  );
}

export default GroupLeaderboard;