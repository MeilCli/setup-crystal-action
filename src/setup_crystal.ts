import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as cache from "@actions/cache";
import * as github from "@actions/github";
import * as os from "os";
import * as path from "path";
import { Option } from "./main";
import { Endpoints } from "@octokit/types";

type ReposGetReleaseByTagResponse = Endpoints["GET /repos/:owner/:repo/releases/tags/:tag"]["response"];
type ReposGetLatestReleaseResponse = Endpoints["GET /repos/:owner/:repo/releases/latest"]["response"];
type ReposGetReleaseByTagResponseAssetsItem = Endpoints["GET /repos/:owner/:repo/releases/tags/:tag"]["response"]["data"]["assets"][0];
type ReposGetLatestReleaseResponseAssetsItem = Endpoints["GET /repos/:owner/:repo/releases/latest"]["response"]["data"]["assets"][0];

const platform: string = os.platform();

async function getInstallAsset(
    option: Option
): Promise<ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem> {
    const client = github.getOctokit(option.githubToken);
    let response: ReposGetReleaseByTagResponse | ReposGetLatestReleaseResponse;
    if (option.crystalVersion != "latest") {
        response = await client.repos.getReleaseByTag({
            owner: "crystal-lang",
            repo: "crystal",
            tag: option.crystalVersion,
        });
    } else {
        response = await client.repos.getLatestRelease({
            owner: "crystal-lang",
            repo: "crystal",
        });
    }

    if (400 <= response.status) {
        throw Error("fail get crystal releases");
    }

    const assets: Array<ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem> = [];

    for (const asset of response.data.assets) {
        assets.push(asset);
    }

    const fileUrls = assets.filter((x) => {
        if (platform == "darwin") {
            return x.name.endsWith("-darwin-x86_64.tar.gz");
        } else {
            return x.name.endsWith("-linux-x86_64.tar.gz");
        }
    });
    const fileUrl = fileUrls.sort()[fileUrls.length - 1];

    return fileUrl;
}

async function installNeedSoftware() {
    if (platform == "linux") {
        await exec.exec("sudo apt-get install libevent-dev", undefined);
    }
}

export function toVersion(name: string): string {
    return name.replace("crystal-", "").replace("-darwin-x86_64.tar.gz", "").replace("-linux-x86_64.tar.gz", "");
}

function getChildFolder(
    asset: ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem
): string {
    return asset.name.replace("-darwin-x86_64.tar.gz", "").replace("-linux-x86_64.tar.gz", "");
}

// return installed location
export async function installCrystal(option: Option): Promise<string> {
    if (platform == "win32") {
        throw Error("setup crystal action not support windows");
    }

    const installAsset = await getInstallAsset(option);
    const version = toVersion(installAsset.name);

    if (option.cacheMode == "tool-cache") {
        return await installCrystalToUseToolCache(installAsset, version);
    } else {
        return await installCrystalToTemp(installAsset, version, option);
    }
}

async function installCrystalToUseToolCache(
    installAsset: ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem,
    version: string
): Promise<string> {
    let toolPath = tc.find("crystal", version);
    if (!toolPath) {
        const downloadPath = await tc.downloadTool(installAsset.browser_download_url);
        const extractPath = await tc.extractTar(downloadPath);
        toolPath = await tc.cacheDir(extractPath, "crystal", version);
    }

    // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
    // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
    const binPath = path.join(toolPath, getChildFolder(installAsset), "bin");
    core.addPath(binPath);
    core.info(`crystal bin: ${binPath}`);
    await installNeedSoftware();
    core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
    return path.join(toolPath, getChildFolder(installAsset));
}

async function installCrystalToTemp(
    installAsset: ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem,
    version: string,
    option: Option
): Promise<string> {
    if (option.installRoot == null) {
        throw new Error("install root is null");
    }

    const crystalPath = path.join(option.installRoot, "crystal");
    // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
    // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
    const binPath = path.join(crystalPath, getChildFolder(installAsset), "bin");
    // postfix number is internal version by this action
    const cacheKey = `${platform}-crystal-${version}-6`;

    try {
        if (option.cacheMode == "cache") {
            const fitKey = await cache.restoreCache([crystalPath], cacheKey);
            if (fitKey == cacheKey) {
                core.info("cache hit: crystal");
                core.addPath(binPath);
                core.info(`crystal bin: ${binPath}`);
                await installNeedSoftware();
                core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
                return path.join(crystalPath, getChildFolder(installAsset));
            }
        }
    } catch (error) {
        core.info("fails cache restore");
    }

    const downloadPath = await tc.downloadTool(installAsset.browser_download_url);
    const extractPath = await tc.extractTar(downloadPath);
    await io.cp(extractPath, crystalPath, { recursive: true, force: true });

    if (option.cacheMode == "cache") {
        await cache.saveCache([crystalPath], cacheKey);
    }
    core.addPath(binPath);
    core.info(`crystal bin: ${binPath}`);
    await installNeedSoftware();
    core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
    return path.join(crystalPath, getChildFolder(installAsset));
}
