import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash } from '@fortawesome/free-regular-svg-icons';

function Teams(){
    //connect to the DB and pull the list of all the teams
    const [message, setMessage] = useState("");
    const [teams, setTeams] = useState([]);
    const [loadStatus, setLoadedStatus] = useState("loading");

    useEffect(() => {
    async function load() {
      try {
        const [helloRes, teamsRes] = await Promise.all([
          fetch("/api/hello"),
          fetch("/api/teams")
        ]);

        if (!helloRes.ok || !teamsRes.ok) {
          throw new Error("Server returned an error");
        }

        const helloData = await helloRes.json();
        const teamsData = await teamsRes.json();

        setMessage(helloData.message);
        setTeams(teamsData);

        setLoadedStatus("done");
      } catch (err) {
        setLoadedStatus("error");
      }
    }
    load();
    }, []);

    if (loadStatus === "loading") return <p>Loading...</p>;
    if (loadStatus === "error") return <p>error connecting</p>

    return(
        <>
            <div>Server test: {message}</div>
            <search></search>
            <div>
                current teams
                {teams.users.map((team) => (
                    <div key={team.team_id}>{team.team_name} <button>Follow</button> <button><FontAwesomeIcon icon={faBellSlash}/></button></div>
                ))}
            </div>
        </>
    )
}

export default Teams;