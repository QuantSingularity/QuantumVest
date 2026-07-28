import { assetAPI } from "../services/api";

let cachePromise = null;

// The transactions endpoint only returns asset_id (no nested asset), so we
// keep a small in-memory id -> asset map for the session to resolve
// symbols/names for display.
export const getAssetMap = async () => {
  if (!cachePromise) {
    cachePromise = assetAPI
      .list({ per_page: 100 })
      .then(({ data }) => {
        const map = {};
        (data.assets || []).forEach((asset) => {
          map[asset.id] = asset;
        });
        return map;
      })
      .catch(() => ({}));
  }
  return cachePromise;
};

export const invalidateAssetMap = () => {
  cachePromise = null;
};
