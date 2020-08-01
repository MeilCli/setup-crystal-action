import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as path from "path";
import { getState, getCrystalCacheKey, getShardsCacheKey } from "./state";

async function run() {
    try {
        const state = getState();
        const crystalPath = path.join(state.installRoot, "crystal");
        const crystalCacheKey = getCrystalCacheKey();
        const shardsPath = path.join(state.installRoot, "shards");
        const shardsCacheKey = getShardsCacheKey();
        if (state.requiredSaveCrystalCache && crystalCacheKey != null) {
            await cache.saveCache([crystalPath], crystalCacheKey);
        }
        if (state.requiredSaveShardsCache && shardsCacheKey != null) {
            await cache.saveCache([shardsPath], shardsCacheKey);
        }
    } catch (error) {
        core.error(error.message);
    }
}

run();
