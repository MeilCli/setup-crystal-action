import * as core from "@actions/core";
import { installCrystal } from "./setup_crystal";
import { installShards } from "./setup_shards";

export interface Option {
    crystalVersion: string;
    shardsVersion: string | null;
    githubToken: string;
}

function getOption(): Option {
    const crystalVersion = core.getInput("crystal_version", { required: true });
    let shardsVersion: string | null = core.getInput("shards_version");
    if (shardsVersion.length == 0) {
        shardsVersion = null;
    }
    const githubToken = core.getInput("github_token", { required: true });
    return {
        crystalVersion: crystalVersion,
        shardsVersion: shardsVersion,
        githubToken: githubToken
    };
}

async function run() {
    try {
        const option = getOption();
        await installCrystal(option);
        await installShards(option);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
