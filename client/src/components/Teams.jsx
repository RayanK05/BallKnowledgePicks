import "../styles/Teams.css"
import { useEffect, useState } from "react";
import Notifications from "./Notifications";

function Teams(){
    const user_id = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    //connect to the DB and pull the list of all the teams
    const [teams, setTeams] = useState([]);
    const [loadStatus, setLoadedStatus] = useState("loading");
    const [following, setFollowing] = useState([]);
    const [activeTab, setActiveTab] = useState("teams");
    const [teamSearch, setTeamSearch] = useState("");

    useEffect(() => {
      const load = async () => {
        try {
          const [teamsRes, followDataRes] = await Promise.all([
            fetch("/api/teams"),
            fetch("/api/followData", {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          ]);

          if (!teamsRes.ok || !followDataRes.ok) {
            throw new Error("Server returned an error");
          }

          const teamsData = await teamsRes.json();
          const followData = await followDataRes.json();

          setTeams(teamsData);
          setFollowing(followData);

          updateFollowing();

          setLoadedStatus("done");
        } catch (err) {
          setLoadedStatus("error");
        }
      }
      load();
    }, [token]);

    const updateFollowing = async () =>{ 
      try{
        const [followDataRes] = await Promise.all([
          fetch("/api/followData", {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        const followData = await followDataRes.json();
        setFollowing(followData);
        setLoadedStatus("done");
      }catch (err){
        setLoadedStatus("error");
      }
    }  

    const follow = async (team_id) => {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id, team_id })
      });
      if (!response.ok) {
        throw new Error("Failed to update follow status");
      }
      const data = await response.json();

      await updateFollowing();

      return data;
    }

    const notificationUpdate = async (team_id) => {
      const response = await fetch('/api/notification', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ team_id })
      });
      if (!response.ok) {
        throw new Error("Failed to update notification status");
      }
      const data = await response.json();

      await updateFollowing();

      return data;
    }

    const filteredTeams = (teams.teams || []).filter((team) => {
        const search = teamSearch.toLowerCase().trim();

        return (
            team.team_name.toLowerCase().includes(search)
        );
    });

    if (loadStatus === "loading") return <p>Loading...</p>;
    if (loadStatus === "error") return <p>error connecting</p>

    return(
        <>
             <header className="page-header">
              <h1>TEAMS & NOTIFICATIONS</h1>
              <p>Follow teams to get game-day and final-score alerts.</p>
            </header>

            <div className="tabs">
              <button
                className={`tab ${activeTab === "teams" ? "active" : ""}`}
                onClick={() => setActiveTab("teams")}
              >
                TEAMS
              </button>

              <button
                className={`tab ${activeTab === "notifications" ? "active" : ""}`}
                onClick={() => setActiveTab("notifications")}
              >
                NOTIFICATIONS 🟠
              </button>
            </div>
          {activeTab === "teams" && (
            <>
              <div className="team-toolbar">
                <input
                  type="text"
                  placeholder="⌕  Search teams..."
                  className="team-search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
              
                <span className="following-count">
                  Following {following.following?.length || 0} of {teams.teams.length}
                </span>
              </div>
             <div className="team-grid">
                {filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => {
                        const isFollowing = following.following?.some(
                            (item) => item.team_id === team.team_id
                        );

                        const notificationsOn = following.following?.find(
                            (item) => item.team_id === team.team_id
                        )?.notifications_on;

                        return (
                            <div className="team-card" key={team.team_id}>

                                <div className="team-info">
                                    <div className="team-logo">
                                        {"PLH"}
                                    </div>

                                    <div>
                                        <span className="team-city">{team.city}</span>
                                        <h3>{team.team_name}</h3>
                                    </div>
                                </div>

                                <button
                                    className={isFollowing ? "followed-button" : "follow-button"}
                                    onClick={() => follow(team.team_id)}
                                >
                                    {isFollowing ? "✓ Following · Unfollow" : "+ Follow"}
                                </button>

                                {isFollowing && (
                                    <div className="notification-row">
                                        <span>Notifications {notificationsOn ? "on" : "off"}</span>

                                        <input
                                            type="checkbox"
                                            checked={notificationsOn}
                                            onChange={() => notificationUpdate(team.team_id)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="no-teams">
                        No teams found matching "{teamSearch}".
                    </p>
                )}
            </div>
            </>
          )}
          {activeTab === "notifications" && (
            <>
              <div>
                <Notifications/>
              </div>
            </>
          )}    
        </>
    )
}

export default Teams;