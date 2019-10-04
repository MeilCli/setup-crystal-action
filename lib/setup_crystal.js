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
const tc = __importStar(require("@actions/tool-cache"));
const octkit = __importStar(require("@actions/github"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const platform = os.platform();
function getInstallAsset(option) {
    return __awaiter(this, void 0, void 0, function* () {
        const github = new octkit.GitHub(option.githubToken);
        const response = yield github.repos.getReleaseByTag({
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
            }
            else {
                return x.name.endsWith("-linux-x86_64.tar.gz");
            }
        });
        const fileUrl = fileUrls.sort()[fileUrls.length - 1];
        return fileUrl;
    });
}
function installCrystal(option) {
    return __awaiter(this, void 0, void 0, function* () {
        if (platform == "win32") {
            throw Error("setup crystal action not support windows");
        }
        const installAsset = yield getInstallAsset(option);
        const version = installAsset.name
            .replace("-darwin-x86_64.tar.gz", "")
            .replace("-linux-x86_64.tar.gz", "");
        let toolPath = tc.find("crystal", version, platform);
        if (!toolPath) {
            const downloadPath = yield tc.downloadTool(installAsset.browser_download_url);
            const extractPath = yield tc.extractTar(downloadPath);
            toolPath = yield tc.cacheDir(extractPath, "crystal", version, platform);
        }
        // crystal-0.31.1-1-darwin-x86_64/crystal-0.31.1-1/bin
        // crystal-0.31.1-1-linux-x86_64/crystal-0.31.1-1/bin
        const binPath = path.join(toolPath, version, "bin");
        core.addPath(binPath);
        core.setOutput("installed_crystal_json", JSON.stringify(installAsset));
    });
}
exports.installCrystal = installCrystal;
