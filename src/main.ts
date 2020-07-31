import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { installCrystal } from "./setup_crystal";
import { installShards } from "./setup_shards";

export interface Option {
    crystalVersion: string;
    shardsVersion: string;
    githubToken: string;
    cacheMode: "none" | "tool-cache" | "cache";
    installRoot: string | null;
}

function getOption(): Option {
    const crystalVersion = core.getInput("crystal_version", { required: true });
    const shardsVersion = core.getInput("shards_version", { required: true });
    const githubToken = core.getInput("github_token", { required: true });
    const cacheMode = core.getInput("cache_mode", { required: false });
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
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
