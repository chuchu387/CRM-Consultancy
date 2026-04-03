import { useCallback, useEffect, useMemo } from "react";
import { toast } from "react-toastify";

import api from "../api/axios";
import useApi from "./useApi";

const useNotifications = () => {
  const { data, loading, error, refetch, setData } = useApi("/notifications/my");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const unreadCount = useMemo(() => data.filter((item) => !item.isRead).length, [data]);

  const markAsRead = useCallback(
    async (id) => {
      try {
        await api.patch(`/notifications/${id}/read`);
        setData((current) =>
          current.map((item) => (item._id === id ? { ...item, isRead: true } : item))
        );
      } catch (markError) {
        toast.error(markError.response?.data?.message || "Unable to mark notification");
      }
    },
    [setData]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setData((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (markError) {
      toast.error(markError.response?.data?.message || "Unable to mark notifications");
    }
  }, [setData]);

  return {
    notifications: data,
    loading,
    unreadCount,
    refetch,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
