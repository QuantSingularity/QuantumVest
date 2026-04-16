import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// BUG FIX: execute was not memoized, causing it to be recreated on every render.
// With immediate=true this triggered an infinite loop: render → new execute →
// useEffect fires → setState → render → repeat.
// Now execute is stable via useCallback with only apiFunction in deps.
export const useApi = (
  apiFunction,
  initialData = null,
  immediate = false,
  ...params
) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...executeParams) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFunction(
          ...(executeParams.length > 0 ? executeParams : params),
        );
        setData(result);
        return result;
      } catch (err) {
        setError(err.message || "An error occurred");
        return null;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFunction],
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // execute is now stable; immediate is a prop that should not change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, execute, setData };
};

// Custom hook for handling form state
export const useForm = (initialValues = {}, validate = () => ({})) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = (callback) => (e) => {
    e.preventDefault();
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setTouched(allTouched);
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      callback(values);
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setIsSubmitting,
  };
};

// Custom hook for local storage
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Custom hook for media queries
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
};

// Custom hook for outside click detection
export const useOutsideClick = (callback) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [callback]);

  return ref;
};
