import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { installCrystal } from "./setup_crystal";
import { installShards } from "./setup_shards";
import { putState } from "./state";

export interface Option {
    crystalVersion: string;
    shardsVersion: string;
    githubToken: string;
    cacheMode: "none" | "tool-cache" | "cache";
    cachePrefix: string;
    installRoot: string | null;
}

function getOption(): Option {
    const crystalVersion = core.getInput("crystal_version", { required: true });
    const shardsVersion = core.getInput("shards_version", { required: true });
    const githubToken = core.getInput("github_token", { required: true });
    const cacheMode = core.getInput("cache_mode", { required: false });
    const cachePrefix = core.getInput("cache_prefix", { required: false });
    let installRoot: string | null = core.getInput("install_root", { required: false });
    let cacheModeValue: "none" | "tool-cache" | "cache" = "cache";
    if (cacheMode == "none") {
        cacheModeValue = "none";
    }
    if (cacheMode == "tool-cache") {
        cacheModeValue = "tool-cache";
    }
    if (installRoot?.length == 0) {
        installRoot = null;
    }
    return {
        crystalVersion: crystalVersion,
        shardsVersion: shardsVersion,
        githubToken: githubToken,
        cacheMode: cacheModeValue,
        cachePrefix: cachePrefix,
        installRoot: installRoot,
    };
}

async function run() {
    try {
        const option = getOption();
        const crystalInstalledPath = await installCrystal(option);
        await exec.exec("crystal version");
        if (option.shardsVersion != "skip") {
            await installShards(option, crystalInstalledPath);
        }
        if (option.cacheMode == "cache") {
            putState({
                requiredSaveCrystalCache: true,
                requiredSaveShardsCache: option.shardsVersion != "skip",
                installRoot: option.installRoot ?? "",
            });
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
