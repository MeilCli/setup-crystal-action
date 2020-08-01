import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as cache from "@actions/cache";
import * as github from "@actions/github";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as semver from "semver";
import { Option } from "./main";
import { Endpoints } from "@octokit/types";
import { putShardsCacheKey } from "./state";

type ReposGetReleaseByTagResponse = Endpoints["GET /repos/:owner/:repo/releases/tags/:tag"]["response"];
type ReposGetLatestReleaseResponse = Endpoints["GET /repos/:owner/:repo/releases/latest"]["response"];
type ReposGetReleaseByTag = Endpoints["GET /repos/:owner/:repo/releases/tags/:tag"]["response"]["data"];
type ReposGetLatestRelease = Endpoints["GET /repos/:owner/:repo/releases/latest"]["response"]["data"];

const platform: string = os.platform();

async function getInstallAsset(option: Option): Promise<ReposGetReleaseByTag | ReposGetLatestRelease> {
    const client = github.getOctokit(option.githubToken);
    let response: ReposGetReleaseByTagResponse | ReposGetLatestReleaseResponse;
    if (option.shardsVersion != "latest") {
        response = await client.repos.getReleaseByTag({
            owner: "crystal-lang",
            repo: "shards",
            tag: `v${option.shardsVersion}`,
        });
    } else {
        response = await client.repos.getLatestRelease({
            owner: "crystal-lang",
            repo: "shards",
        });
    }

    if (400 <= response.status) {
        throw Error("fail get crystal releases");
    }

    return response.data;
}

async function installNeedSoftware() {
    if (platform == "linux") {
        await exec.exec("sudo apt-get install libyaml-dev", undefined);
    }
    if (platform == "darwin") {
        await exec.exec("brew install libyaml", undefined);
    }
}

async function shardsInstall(crystalInstalledPath: string, sourcePath: string) {
    if (platform == "linux") {
        await exec.exec(`${crystalInstalledPath}/bin/shards install`, undefined, {
            cwd: sourcePath,
        });
    }
    if (platform == "darwin") {
        await exec.exec(`${crystalInstalledPath}/embedded/bin/shards install`, undefined, {
            cwd: sourcePath,
        });
    }
}

export async function installShards(option: Option, crystalInstalledPath: string) {
    if (platform == "win32") {
        throw Error("setup crystal action not support windows");
    }
    if (option.shardsVersion == null && platform == "linux") {
        return;
    }

    const installAsset = await getInstallAsset(option);

    await installNeedSoftware();

    if (option.cacheMode == "tool-cache") {
        await installShardsToToolCache(installAsset, crystalInstalledPath, option);
    } else {
        await installShardsToTemp(installAsset, crystalInstalledPath, option);
    }
}

async function installShardsToToolCache(
    installAsset: ReposGetReleaseByTag | ReposGetLatestRelease,
    crystalInstalledPath: string,
    option: Option
) {
    await installNeedSoftware();

    let toolPath = tc.find("shards", installAsset.tag_name);
    if (!toolPath) {
        const downloadPath = await tc.downloadTool(installAsset.tarball_url);
        const extractPath = await tc.extractTar(downloadPath);
        const nestedFolder = fs.readdirSync(extractPath).filter((x) => x.startsWith("crystal"))[0];
        const sourcePath = path.join(extractPath, nestedFolder);

        if (option.shardsVersion == "latest" || semver.lte("0.10.0", option.shardsVersion)) {
            // shards changes to require crystal-molinillo on 0.10.0
            await shardsInstall(crystalInstalledPath, sourcePath);
            await exec.exec("make", undefined, {
                cwd: sourcePath,
            });
        } else {
            await exec.exec("make CRFLAGS=--release", undefined, {
                cwd: sourcePath,
            });
        }
        toolPath = await tc.cacheDir(sourcePath, "shards", installAsset.tag_name);
    }

    const binPath = path.join(toolPath, "bin");
    core.addPath(binPath);
    core.info(`shards bin: ${binPath}`);

    core.setOutput("installed_shards_json", JSON.stringify(installAsset));
}

async function installShardsToTemp(
    installAsset: ReposGetReleaseByTag | ReposGetLatestRelease,
    crystalInstalledPath: string,
    option: Option
) {
    if (option.installRoot == null) {
        throw new Error("install root is null");
    }

    await installNeedSoftware();

    const shardsPath = path.join(option.installRoot, "shards");
    const binPath = path.join(shardsPath, "bin");
    // postfix number is internal version by this action
    const cacheKey = `${option.cachePrefix}setup-crystal-${platform}-shards-${installAsset.tag_name}-8`;

    try {
        if (option.cacheMode == "cache") {
            const fitKey = await cache.restoreCache([shardsPath], cacheKey);
            if (fitKey == cacheKey) {
                core.info("cache hit: shards");
                core.addPath(binPath);
                core.info(`shards bin: ${binPath}`);
                core.setOutput("installed_shards_json", JSON.stringify(installAsset));
                return;
            }
        }
    } catch (error) {
        core.info("fails cache restore");
    }

    putShardsCacheKey(cacheKey);

    const downloadPath = await tc.downloadTool(installAsset.tarball_url);
    const extractPath = await tc.extractTar(downloadPath);
    const nestedFolder = fs.readdirSync(extractPath).filter((x) => x.startsWith("crystal"))[0];
    await io.cp(path.join(extractPath, nestedFolder), shardsPath, { recursive: true, force: true });

    if (option.shardsVersion == "latest" || semver.lte("0.10.0", option.shardsVersion)) {
        // shards changes to require crystal-molinillo on 0.10.0
        await shardsInstall(crystalInstalledPath, shardsPath);
        await exec.exec("make", undefined, {
            cwd: shardsPath,
        });
    } else {
        await exec.exec("make CRFLAGS=--release", undefined, {
            cwd: shardsPath,
        });
    }

    core.addPath(binPath);
    core.info(`shards bin: ${binPath}`);

    core.setOutput("installed_shards_json", JSON.stringify(installAsset));
}
