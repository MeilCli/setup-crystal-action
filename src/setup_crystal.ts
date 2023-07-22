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
import { putCrystalCacheKey } from "./state";

type ReposGetReleaseByTagResponse = Endpoints["GET /repos/{owner}/{repo}/releases/tags/{tag}"]["response"];
type ReposGetLatestReleaseResponse = Endpoints["GET /repos/{owner}/{repo}/releases/latest"]["response"];
type ReposGetReleaseByTagResponseAssetsItem =
    Endpoints["GET /repos/{owner}/{repo}/releases/tags/{tag}"]["response"]["data"]["assets"][0];
type ReposGetLatestReleaseResponseAssetsItem =
    Endpoints["GET /repos/{owner}/{repo}/releases/latest"]["response"]["data"]["assets"][0];

const platform: string = os.platform();

// resource name changed since Crystal 1.2.0
const oldDarwinPostfix = "-darwin-x86_64.tar.gz";
const darwinPostfix = "-darwin-universal.tar.gz";
const linuxPostfix = "-linux-x86_64.tar.gz";

async function getInstallAsset(
    option: Option,
): Promise<ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem> {
    const client = github.getOctokit(option.githubToken);
    let response: ReposGetReleaseByTagResponse | ReposGetLatestReleaseResponse;
    if (option.crystalVersion != "latest") {
        response = await client.rest.repos.getReleaseByTag({
            owner: "crystal-lang",
            repo: "crystal",
            tag: option.crystalVersion,
        });
    } else {
        response = await client.rest.repos.getLatestRelease({
            owner: "crystal-lang",
            repo: "crystal",
        });
    }

    if (400 <= response.status) {
        throw Error("fail get crystal releases");
    }

    const assets: Array<ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem> = [];

    for (const asset of response.data.assets ?? []) {
        assets.push(asset);
    }

    const fileUrls = assets.filter((x) => {
        if (platform == "darwin") {
            return x.name.endsWith(oldDarwinPostfix) || x.name.endsWith(darwinPostfix);
        } else {
            return x.name.endsWith(linuxPostfix);
        }
    });

    if (fileUrls.length == 0) {
        throw Error(`cannot find binary assets: ${option.crystalVersion} crystal`);
    }

    const fileUrl = fileUrls.sort()[fileUrls.length - 1];

    return fileUrl;
}

async function installNeedSoftware() {
    if (platform == "linux") {
        await exec.exec("sudo apt-get install libevent-dev", undefined);
    }
}

export function toVersion(name: string): string {
    return name
        .replace("crystal-", "")
        .replace(oldDarwinPostfix, "")
        .replace(darwinPostfix, "")
        .replace(linuxPostfix, "");
}

function getChildFolder(
    asset: ReposGetReleaseByTagResponseAssetsItem | ReposGetLatestReleaseResponseAssetsItem,
): string {
    return asset.name.replace(oldDarwinPostfix, "").replace(darwinPostfix, "").replace(linuxPostfix, "");
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
    version: string,
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
    option: Option,
): Promise<string> {
    if (option.installRoot == null) {
        throw new Error("install root is null");
    }

    const crystalPath = path.join(option.installRoot, "crystal");
    // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
    // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
    const binPath = path.join(crystalPath, getChildFolder(installAsset), "bin");
    // postfix number is internal version by this action
    const cacheKey = `${option.cachePrefix}setup-crystal-${platform}-crystal-${version}-8`;

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

    putCrystalCacheKey(cacheKey);

    const downloadPath = await tc.downloadTool(installAsset.browser_download_url);
    const extractPath = await tc.extractTar(downloadPath);
    await io.cp(extractPath, crystalPath, { recursive: true, force: true });

    core.addPath(binPath);
    core.info(`crystal bin: ${binPath}`);
    await installNeedSoftware();
    core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
    return path.join(crystalPath, getChildFolder(installAsset));
}
