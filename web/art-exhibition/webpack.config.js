const path = require("path");

module.exports = {
    mode: "production",
    entry: ["./src/components/index.tsx"],
    watch: false,
    devtool: false,
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "shadcn.js",
        library: "SHADN",
        libraryTarget: "umd",
        umdNamedDefine: true,
        globalObject: 'typeof globalThis !== "undefined"?globalThis:typeof window !== "undefined"?window:this',
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        extensionAlias: {
            ".js": [".js", ".ts"],
            ".cjs": [".cjs", ".cts"],
            ".mjs": [".mjs", ".mts"],
        },
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    module: {
        rules: [
            {
                test: /\.([cm]?ts|tsx)$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env", "@babel/preset-react"],
                        },
                    },
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true,
                            configFile: path.resolve(__dirname, "./tsconfig.json"),
                        },
                    },
                ],
            },
            {
                test: /\.jsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env", "@babel/preset-react"],
                        },
                    },
                ],
            },
        ],
    },
    plugins: [],
    externals: {
        react: { root: "React", commonjs: "react", commonjs2: "react" },
        "react-dom": {
            root: "ReactDOM",
            commonjs: "react-dom",
            commonjs2: "react-dom",
        },
    },
};