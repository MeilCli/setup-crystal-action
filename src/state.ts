import * as core from "@actions/core";

export interface State {
    requiredSaveCrystalCache: boolean;
    requiredSaveShardsCache: boolean;
    installRoot: string;
}

export function getState(): State {
    return {
        requiredSaveCrystalCache: core.getState("required_save_crystal_cache") == "true",
        requiredSaveShardsCache: core.getState("required_save_shards_cache") == "true",
        installRoot: core.getState("install_root"),
    };
}

export function putState(state: State) {
    core.saveState("required_save_crystal_cache", state.requiredSaveCrystalCache ? "true" : "false");
    core.saveState("required_save_shards_cache", state.requiredSaveShardsCache ? "true" : "false");
    core.saveState("install_root", state.installRoot);
}

export function getCrystalCacheKey(): string | null {
    const key = core.getState("crystal_cache_key");
    if (key.length == 0) {
        return null;
    }
    return key;
}

export function putCrystalCacheKey(key: string) {
    core.saveState("crystal_cache_key", key);
}

export function getShardsCacheKey(): string | null {
    const key = core.getState("shards_cache_key");
    if (key.length == 0) {
        return null;
    }
    return key;
}

export function putShardsCacheKey(key: string) {
    core.saveState("shards_cache_key", key);
}
