import { useEffect, useState } from "react";
import '../styles/Notifications.css'

function Notifications(){
    const user_id = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    //when the game status is updated all people in the DB who have notifications on for team_id, a new notification entry will be added to the DB
    const [notifications, setNotifications] = useState([]);
    const [loadStatus, setLoadedStatus] = useState("loading");

    useEffect(() =>{
      const load = async () => {
        try {
            const [notiRes] = await Promise.all([
                fetch("/api/getNotification", {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
                })
            ]);

            if (!notiRes.ok) {
                throw new Error("Server returned an error");
            }

            const notiData = await notiRes.json();

            setNotifications(notiData.notifications)

            setLoadedStatus("done");
        } catch (err) {
          setLoadedStatus("error");
        }
      }
      load();
    },[token]);

    const describe = (n) => {
        const opponent = n.followed_team === n.home_team ? n.away_team : n.home_team;

        // if (n.alert_type === "game_day") {
        // return `${n.followed_team} play ${opponent} today`;
        // }
        const result = n.alert_type === "win" ? "beat" : "lost to";
        return `${n.followed_team} ${result} ${opponent}, ${n.home_score}-${n.away_score}`;
    };

    if (loadStatus === "loading") return <p>Loading...</p>;
    if (loadStatus === "error") return <p>error connecting</p>

    return (
    <div className="notifications-page">

        <header className="page-header">
        <h1>NOTIFICATIONS</h1>
        <p>Stay up to date with your teams, games, and groups.</p>
        </header>

        <div className="notifications-container">

        <div className="notifications-heading">
            <h2>RECENT ACTIVITY</h2>
            <span>{notifications.length} notifications</span>
        </div>

        {notifications.length === 0 ? (
            <div className="empty-notifications">
            <span className="empty-icon">🔔</span>
            <h3>No notifications yet</h3>
            <p>We'll let you know when something happens.</p>
            </div>
        ) : (
            <div className="notification-list">
            {notifications.map((n) => (
                <div
                className="notification-card"
                key={n.notification_id}
                >
                <div className="notification-icon">
                    🔔
                </div>

                <div className="notification-details">
                    <div className="notification-message">
                    {describe(n)}
                    </div>

                    {/* <span className="notification-time">
                    {new Date(n.created_at).toLocaleString()}
                    </span> */}
                </div>
                <div>
                    <button>delete notification</button>
                </div>
                </div>
            ))}
            </div>
        )}

        </div>
    </div>
    );
}

export default Notifications;