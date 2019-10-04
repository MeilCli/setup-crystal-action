import * as core from "@actions/core";
import { installCrystal } from "./setup_crystal";

export interface Option {
    crystalVersion: string;
    githubToken: string;
}

function getOption(): Option {
    const crystalVersion = core.getInput("crystal_version", { required: true });
    const githubToken = core.getInput("github_token", { required: true });
    return {
        crystalVersion: crystalVersion,
        githubToken: githubToken
    };
}

async function run() {
    try {
        const option = getOption();
        await installCrystal(option);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
