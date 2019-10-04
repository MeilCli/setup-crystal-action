import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as octkit from "@actions/github";
import * as os from "os";
import * as path from "path";
import { Option } from "./main";
import { ReposGetReleaseByTagResponseAssetsItem } from "@octokit/rest";

const platform: string = os.platform();

async function getInstallAsset(
    option: Option
): Promise<ReposGetReleaseByTagResponseAssetsItem> {
    const github = new octkit.GitHub(option.githubToken);
    const response = await github.repos.getReleaseByTag({
        owner: "crystal-lang",
        repo: "crystal",
        tag: option.crystalVersion
    });

    if (400 <= response.status) {
        throw Error("fail get crystal releases");
    }

    const fileUrls = response.data.assets.filter(x => {
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
        await exec.exec("apt-get install libevent-dev", undefined);
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

    let toolPath = tc.find("crystal", version, platform);
    if (!toolPath) {
        const downloadPath = await tc.downloadTool(
            installAsset.browser_download_url
        );
        const extractPath = await tc.extractTar(downloadPath);
        toolPath = await tc.cacheDir(extractPath, "crystal", version, platform);
    }

    // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
    // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
    const binPath = path.join(toolPath, version, "bin");
    core.addPath(binPath);

    await installNeedSoftware();

    core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
}
