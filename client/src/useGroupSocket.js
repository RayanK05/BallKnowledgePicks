import { useEffect, useRef } from "react";
import { socket } from "./Socket";

export function useGroupSocket(groupId, onUpdate) {
  const handler = useRef(onUpdate);
  handler.current = onUpdate; // always call the latest callback

  useEffect(() => {
    if (!groupId) return;

    const join = () =>
      socket.emit("joinGroup", groupId, (res) => {
        if (res?.ok) handler.current({ type: "connected" }); // refetch to catch anything missed
      });
    const onGroupUpdate = (data) => handler.current(data);

    socket.on("connect", join); // runs on every (re)connect, since rooms are lost on disconnect
    socket.on("groupUpdate", onGroupUpdate);

    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off("connect", join);
      socket.off("groupUpdate", onGroupUpdate);
      socket.emit("leaveGroup", groupId);
    };
  }, [groupId]);
}