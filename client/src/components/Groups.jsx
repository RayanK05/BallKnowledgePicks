import { useEffect, useState } from "react";
import "../styles/Group.css"
import GroupLeaderboard from "./GroupLeaderboard";

function Groups(){
    const user_id = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    const [groupName, setGroupName] = useState("");
    const [groupCode, setGroupCode] = useState("");
    const [myGroups, setMyGroups] = useState([]);
    const [currentGroupViewing, setcurrentGroupViewing] = useState();

    const load = async () => {
        const response = await fetch('/api/myGroups', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });
            if (!response.ok) {
                throw new Error("Failed to get my groups");
            }
            const data = await response.json();

            setMyGroups(data);

            return data;
        }

    useEffect(() => {
        load();
    },[token]);

    const createGroup = async (group_name) => {
        const response = await fetch('/api/createGroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ group_name })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error("Failed to join group");
        }
        
        await load();
    }

    const joinGroup = async (group_id) => {
        const response = await fetch('/api/joinGroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ group_id })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error("Failed to join group");
        }
        
        await load();
    }

    const leaveGroup = async (group_id) => {
        const response = await fetch('/api/leaveGroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ group_id })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error("Failed to join group");
        }

        if (currentGroupViewing === group_id) {
            setcurrentGroupViewing(null);   // match the exact name from your useState line
        }
        
        await load();
    }

    const deleteGroup = async (group_id) => {
        const response = await fetch('/api/deleteGroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ group_id })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error("Failed to join group");
        }

        if (currentGroupViewing === group_id) {
            setcurrentGroupViewing(null);   // match the exact name from your useState line
        }
        
        await load();
    }

    return(
        <div className="groups-page">
            <div className="groups-container">

                {/* Left Sidebar */}
                <aside className="groups-sidebar">

                    {/* My Groups */}
                    <section className="group-card">
                        <h2>My Groups viewing: {currentGroupViewing}</h2>

                        <div className="my-groups-list">
                            {myGroups.map((g) => (
                                <div className="my-group-item" key={g.group_id} onClick={() => setcurrentGroupViewing(g.group_id)}>
                                    <div>
                                        <h3>{g.group_name}</h3>
                                        <span>ID: {g.group_id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Create Group */}
                    <section className="group-card">
                        <h2>Create Group</h2>

                        <label htmlFor="Group-name-field">Group name</label>

                        <div className="group-input-row">
                            <input
                                name="Group-name-field"
                                id="Group-name-field"
                                placeholder="e.g. Ontario Tech Hoopers"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />

                            <button
                                className="primary-button"
                                onClick={() => createGroup(groupName)}
                            >
                                Create
                            </button>
                        </div>
                    </section>

                    {/* Join Group */}
                    <section className="group-card">
                        <h2>Join Group</h2>

                        <label htmlFor="Group-id-field">Group ID</label>

                        <div className="group-input-row">
                            <input
                                name="Group-id-field"
                                id="Group-id-field"
                                placeholder="e.g. 4821"
                                value={groupCode}
                                onChange={(e) => setGroupCode(e.target.value)}
                            />

                            <button
                                className="secondary-button"
                                onClick={() => joinGroup(Number(groupCode))}
                            >
                                Join
                            </button>
                        </div>
                    </section>

                </aside>

                {/* Right Main Content */}
                <main className="group-main">

                    <section className="leaderboard-card">

                        <div className="leaderboard-header">
                            <div>
                                <h1>Group Leaderboard</h1>
                                <p>See how your group ranks against each other.</p>
                            </div>

                            <div className="group-actions">
                                <button className="secondary-button" onClick={() => leaveGroup(currentGroupViewing)}>
                                    Leave Group
                                </button>

                                <button className="danger-button" onClick={() => deleteGroup(currentGroupViewing)}>
                                    Delete Group
                                </button>
                            </div>
                        </div>

                        {currentGroupViewing && (
                            <GroupLeaderboard key={currentGroupViewing} groupId={currentGroupViewing} />
                        )}
                    </section>

                </main>

            </div>
        </div>

    )
}

export default Groups;