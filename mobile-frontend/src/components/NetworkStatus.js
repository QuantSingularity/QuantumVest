import React, { useEffect, useRef, useState } from "react";
import { Snackbar } from "react-native-paper";
import NetInfo from "@react-native-community/netinfo";

// Shows a snackbar when connectivity is lost, and a brief confirmation when
// it's restored. NetInfo was already a listed dependency but was never
// wired up — this component previously did nothing.
const NetworkStatus = () => {
  const [visible, setVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const hasDisconnectedOnce = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      setIsConnected((prevConnected) => {
        if (!connected) {
          hasDisconnectedOnce.current = true;
          setVisible(true);
        } else if (hasDisconnectedOnce.current && prevConnected !== connected) {
          setVisible(true);
        }
        return connected;
      });
    });
    return () => unsubscribe();
  }, []);

  return (
    <Snackbar
      visible={visible}
      onDismiss={() => setVisible(false)}
      duration={3000}
      style={{ backgroundColor: isConnected ? "#22c55e" : "#f43f5e" }}
    >
      {isConnected ? "Back online" : "No internet connection"}
    </Snackbar>
  );
};

export default NetworkStatus;
