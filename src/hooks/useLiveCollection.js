import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";

import { db } from "../config/firebase";

export default function useLiveCollection(
  collectionName,
  options = {}
) {
  const {
    enabled = true,
    transform = null,
  } = options;

  const [data, setData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return undefined;
    }

    if (!collectionName) {
      setData([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    /*
      IMPORTANT:

      Do NOT set old/demo data here.

      We deliberately empty the collection while
      the new page is fetching Firestore.
    */

    setData([]);

    const collectionRef =
      collection(
        db,
        collectionName
      );

    const firestoreQuery =
      query(collectionRef);

    const unsubscribe =
      onSnapshot(
        firestoreQuery,

        (snapshot) => {
          let rows =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          if (
            typeof transform ===
            "function"
          ) {
            rows =
              rows.map(transform);
          }

          setData(rows);

          setLoading(false);
        },

        (firebaseError) => {
          console.error(
            `Firestore error in ${collectionName}:`,
            firebaseError
          );

          setError(
            firebaseError?.message ||
              "Unable to load data."
          );

          /*
            DO NOT load demoData when Firebase fails.
          */

          setData([]);

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    collectionName,
    enabled,
    transform,
  ]);

  return {
    data,
    loading,
    error,
  };
}