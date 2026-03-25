import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife",
  outfile: "dist/markux.js",
  target: ["es2020"],
  minify: !isWatch,
  sourcemap: isWatch,
};

if (isWatch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(options);
  console.log("Built dist/markux.js");
}
