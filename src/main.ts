import * as core from "@actions/core";
import { installCrystal } from "./setup_crystal";
import { installShards } from "./setup_shards";

export interface Option {
    crystalVersion: string;
    shardsVersion: string;
    githubToken: string;
}

function getOption(): Option {
    const crystalVersion = core.getInput("crystal_version", { required: true });
    let shardsVersion = core.getInput("shards_version", { required: true });
    if (
        shardsVersion != "latest" &&
        shardsVersion != "skip" &&
        shardsVersion.startsWith("v") == false
    ) {
        shardsVersion = `v${shardsVersion}`;
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
        if (option.shardsVersion != "skip") {
            await installShards(option);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
