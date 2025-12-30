ARG FRAMEWORK_VERSION=20.18.3-1.14.0-32-dafdb5

FROM crunbuild-az-new.tencentcloudcr.com/cloudbase/functions-framework:${FRAMEWORK_VERSION}

RUN PASSWORD=$(dd bs=1 count=12 if=/dev/urandom | md5sum | cut -d' ' -f1) && echo "root:$PASSWORD" | chpasswd -c SHA512

WORKDIR /workspace

COPY . .

RUN . ~/.profile \
  && ls -liha \
  && rm -rf logs \
  && echo "\n\n===> step.1 install specified node.js version" \
  && \
    if [ -e .node-version ]; then \
      echo "     File '.node-version' exists, use '.node-version', content: '$(cat .node-version)'"; \
      nvm install $(cat .node-version) && nvm alias default $(cat .node-version); \
    elif [ -e .nvmrc ]; then \
      echo "     File '.nvmrc' exists, use '.node-version', content: '$(cat .node-version)'"; \
      nvm install && nvm use && nvm alias default $(nvm current); \
    else \
      echo "     File '.node-version' or '.nvmrc' not exists, use buildin node"; \
    fi; \
    echo "     node version $(node -v)" \
  && echo "\n\n===> step.2 install dependency packages" \
  && \
    if [ ! -e package.json ]; then \
      echo "     File 'package.json' not exists, skip install dependencies"; \
    elif [ -e package.json ] && [ -d node_modules ]; then \
      echo "     File 'node_modules' exists, skip install dependencies"; \
    elif [ -e package.json ] && [ ! -d node_modules ]; then \
      echo "     File 'package.json' exists and 'node_modules' not exists, install dependencies"; \
      echo "     ----------- package.json begin -----------"; \
      cat package.json; \
      echo "     ----------- package.json  end  -----------"; \
      echo "     Configure npm"; \
      { \
        echo "omit=dev"; \
        echo "registry=https://mirrors.tencent.com/npm/"; \
        echo "# prebuild-install"; \
        echo "faiss_node_binary_host_mirror=https://static.cloudbase.net/npm_binary_mirrors/faiss-node/"; \
        echo "# puppeteer"; \
        echo "puppeteer-download-base-url=https://cdn.npmmirror.com/binaries/chrome-for-testing"; \
      } >> ~/.npmrc; \
      if [ -e pnpm-lock.yaml ]; then \
        echo "     File 'pnpm-lock.yaml' exists, use 'pnpm install'"; \
        pnpm install; \
      elif [ -e yarn.lock ]; then \
        echo "     File 'yarn.lock' exists, use 'yarn install'"; \
        yarn install; \
        yarn cache clean; \
      else \
        echo "     Default, use 'npm install'"; \
        npm install; \
        npm cache clean --force; \
      fi; \
      if jq -e '(.dependencies | has("puppeteer")) or (.devDependencies | has("puppeteer"))' package.json; then \
        echo "     File 'package.json' dependencies include puppeteer, install dependencies libraries(.so) for puppeteer"; \
        sed -i 's/archive\.ubuntu\.com/mirrors.cloud.tencent.com/g' /etc/apt/sources.list.d/ubuntu.sources; \
        export DEBIAN_FRONTEND=noninteractive; \
        apt update && apt upgrade -y; \
        # 安装 puppeteer 需要的依赖库，比较耗费空间
        # https://source.chromium.org/chromium/chromium/src/+/main:chrome/installer/linux/debian/dist_package_versions.json
        apt install -y libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0 libcairo2 \
          libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libglibd-2.0-0 libnss3 \
          libpango-1.0-0 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2; \
        # 安装 puppeteer 可能需要的字体，如网页截屏场景，比较耗费空间
        apt install -y fonts-noto fonts-dejavu fonts-font-awesome; \
        apt clean; \
        rm -rf /var/lib/apt/lists/*; \
        sed -i 's/mirrors\.cloud\.tencent\.com/archive.ubuntu.com/g' /etc/apt/sources.list.d/ubuntu.sources; \
      fi \
    fi
