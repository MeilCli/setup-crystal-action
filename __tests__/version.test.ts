import * as sc from "../src/setup_crystal";
import { clean } from "semver";

test("crystal version test", () => {
    expect(clean(sc.toVersion("crystal-0.31.1-1-darwin-x86_64.tar.gz"))).toBe("0.31.1-1")
    expect(clean(sc.toVersion("crystal-0.31.1-1-linux-x86_64.tar.gz"))).toBe("0.31.1-1")
})

test("shards version test", () => {
    expect(clean("v0.9.0")).toBe("0.9.0")
})
