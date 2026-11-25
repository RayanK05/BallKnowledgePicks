import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash } from '@fortawesome/free-regular-svg-icons';

function Teams(){
    const user_id = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    //connect to the DB and pull the list of all the teams
    const [message, setMessage] = useState("");
    const [teams, setTeams] = useState([]);
    const [loadStatus, setLoadedStatus] = useState("loading");
    const [following, setFollowing] = useState([]);
    const [NotificationsOn, setNotificationON] = useState(false);

    useEffect(() => {
      const load = async () => {
        try {
          const [helloRes, teamsRes, followDataRes] = await Promise.all([
            fetch("/api/hello"),
            fetch("/api/teams"),
            fetch("/api/followData", {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          ]);

          if (!helloRes.ok || !teamsRes.ok || !followDataRes) {
            throw new Error("Server returned an error");
          }

          const helloData = await helloRes.json();
          const teamsData = await teamsRes.json();
          const followData = await followDataRes.json();

          setMessage(helloData.message);
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

      console.log(data)

      return data;
    }

    const notification = () =>{

    }

    if (loadStatus === "loading") return <p>Loading...</p>;
    if (loadStatus === "error") return <p>error connecting</p>

    return(
        <>
            <div>Server test: {message}</div>
            <search></search>
            <div>
                current teams
                {teams.users.map((team) => (
                    <div key={team.team_id}>
                      {team.team_name} 
                      <button onClick={() => follow(team.team_id)}>
                          {following.following.some(
                            (followedTeam) => followedTeam.team_id === team.team_id
                          ) ? "Unfollow" : "Follow"}
                      </button> 
                      <button><FontAwesomeIcon icon={faBellSlash}/></button>
                    </div>
                ))}
            </div>
        </>
    )
}

export default Teams;