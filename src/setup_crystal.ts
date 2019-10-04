import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as octkit from "@actions/github";
import * as os from "os";
import * as path from "path";
import { Option } from "./main";
import {
    Response,
    ReposGetReleaseByTagResponse,
    ReposGetLatestReleaseResponse,
    ReposGetReleaseByTagResponseAssetsItem,
    ReposGetLatestReleaseResponseAssetsItem
} from "@octokit/rest";

const platform: string = os.platform();

async function getInstallAsset(
    option: Option
): Promise<
    | ReposGetReleaseByTagResponseAssetsItem
    | ReposGetLatestReleaseResponseAssetsItem
> {
    const github = new octkit.GitHub(option.githubToken);
    let response: Response<
        ReposGetReleaseByTagResponse | ReposGetLatestReleaseResponse
    >;
    if (option.crystalVersion != "latest") {
        response = await github.repos.getReleaseByTag({
            owner: "crystal-lang",
            repo: "crystal",
            tag: option.crystalVersion
        });
    } else {
        response = await github.repos.getLatestRelease({
            owner: "crystal-lang",
            repo: "crystal"
        });
    }

    if (400 <= response.status) {
        throw Error("fail get crystal releases");
    }

    const assets: Array<
        | ReposGetReleaseByTagResponseAssetsItem
        | ReposGetLatestReleaseResponseAssetsItem
    > = [];

    for (const asset of response.data.assets) {
        assets.push(asset);
    }

    const fileUrls = assets.filter(x => {
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

export async function installCrystal(option: Option) {
    if (platform == "win32") {
        throw Error("setup crystal action not support windows");
    }

    const installAsset = await getInstallAsset(option);
    const version = installAsset.name
        .replace("-darwin-x86_64.tar.gz", "")
        .replace("-linux-x86_64.tar.gz", "");

    let toolPath = tc.find("crystal", version);
    if (!toolPath) {
        const downloadPath = await tc.downloadTool(
            installAsset.browser_download_url
        );
        const extractPath = await tc.extractTar(downloadPath);
        toolPath = await tc.cacheDir(extractPath, "crystal", version);
    }

    // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
    // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
    const binPath = path.join(toolPath, version, "bin");
    core.addPath(binPath);

    await installNeedSoftware();

    core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
}
