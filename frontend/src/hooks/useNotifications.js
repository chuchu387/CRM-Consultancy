import { useNotificationsContext } from "../context/NotificationContext";

const useNotifications = () => {
  return useNotificationsContext();
};

export default useNotifications;
