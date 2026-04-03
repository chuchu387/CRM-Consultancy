import { useCallback, useEffect, useState } from "react";

import api from "../api/axios";

const useApi = (url, immediate = true) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState("");

  const refetch = useCallback(
    async (overrideUrl = url) => {
      if (!overrideUrl) {
        return null;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get(overrideUrl);
        const payload = response.data?.data ?? [];
        setData(payload);
        return payload;
      } catch (err) {
        const message = err.response?.data?.message || "Unable to load data";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    if (!immediate || !url) {
      setLoading(false);
      return;
    }

    refetch().catch(() => undefined);
  }, [immediate, refetch, url]);

  return {
    data,
    loading,
    error,
    refetch,
    setData,
  };
};

export default useApi;
