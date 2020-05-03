"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const tc = __importStar(require("@actions/tool-cache"));
const octkit = __importStar(require("@actions/github"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const semver = __importStar(require("semver"));
const platform = os.platform();
function getInstallAsset(option) {
    return __awaiter(this, void 0, void 0, function* () {
        const github = new octkit.GitHub(option.githubToken);
        let response;
        if (option.shardsVersion != "latest") {
            response = yield github.repos.getReleaseByTag({
                owner: "crystal-lang",
                repo: "shards",
                tag: `v${option.shardsVersion}`
            });
        }
        else {
            response = yield github.repos.getLatestRelease({
                owner: "crystal-lang",
                repo: "shards"
            });
        }
        if (400 <= response.status) {
            throw Error("fail get crystal releases");
        }
        return response.data;
    });
}
function installNeedSoftware() {
    return __awaiter(this, void 0, void 0, function* () {
        if (platform == "linux") {
            yield exec.exec("sudo apt-get install libyaml-dev", undefined);
        }
        if (platform == "darwin") {
            yield exec.exec("brew install libyaml", undefined);
        }
    });
}
function installShards(option) {
    return __awaiter(this, void 0, void 0, function* () {
        if (platform == "win32") {
            throw Error("setup crystal action not support windows");
        }
        if (option.shardsVersion == null && platform == "linux") {
            return;
        }
        const installAsset = yield getInstallAsset(option);
        yield installNeedSoftware();
        let toolPath = tc.find("shards", installAsset.tag_name);
        if (!toolPath) {
            const downloadPath = yield tc.downloadTool(installAsset.tarball_url);
            const extractPath = yield tc.extractTar(downloadPath);
            const nestedFolder = fs.readdirSync(extractPath).filter(x => x.startsWith("crystal"))[0];
            const sourcePath = path.join(extractPath, nestedFolder);
            core.info(`dump option shards: ${option.shardsVersion}, 0.10.0 <= shards == ${semver.lte("0.10.0", option.shardsVersion)}`);
            if (option.shardsVersion == "latest" || semver.lte("0.10.0", option.shardsVersion)) {
                // shards changes to require crystal-molinillo on 0.10.0
                yield exec.exec("make lib", undefined, {
                    cwd: sourcePath
                });
                yield exec.exec("make", undefined, {
                    cwd: sourcePath
                });
            }
            else {
                yield exec.exec("make CRFLAGS=--release", undefined, {
                    cwd: sourcePath
                });
            }
            toolPath = yield tc.cacheDir(sourcePath, "shards", installAsset.tag_name);
        }
        const binPath = path.join(toolPath, "bin");
        core.addPath(binPath);
        core.setOutput("installed_shards_json", JSON.stringify(installAsset));
    });
}
exports.installShards = installShards;
