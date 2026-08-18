ARG FRAMEWORK_VERSION=20.18.3-1.8.0

FROM crunbuild-az-new.tencentcloudcr.com/cloudbase/functions-framework:${FRAMEWORK_VERSION}

RUN PASSWORD=$(dd bs=1 count=12 if=/dev/urandom | md5sum | cut -d' ' -f1) && echo "root:$PASSWORD" | chpasswd -c SHA512

WORKDIR /workspace

COPY . .

RUN . ~/.profile \
  && ls -liha \
  && rm -rf logs

RUN . ~/.profile \
  && echo "\n\n===> step.1.1 install specified node.js version" \
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
  && echo "\n\n===> step.1.2 install dependency packages" \
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
      if [ -e pnpm-lock.yaml ] ; then \
        echo "     File 'pnpm-lock.yaml' exists, use 'pnpm install'"; \
        pnpm install; \
      elif [ -e yarn.lock ]; then \
        echo "     File 'yarn.lock' exists, use 'yarn install'"; \
        yarn install; \
      else \
        echo "     Default, use 'npm install'"; \
        npm install; \
      fi \
    fi

RUN . ~/.profile \
  && echo "\n\n===> step.2 auto install dependency libraries" \
  && \
    if [ -e package.json ]; then \
      if jq -e '(.dependencies | has("puppeteer")) or (.devDependencies | has("puppeteer"))' package.json; then \
        echo "File 'package.json' exists and dependencies include puppeteer, install dependencies libraries(.so) for puppeteer"; \
        DEBIAN_FRONTEND=noninteractive apt install -y libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0 libcairo2 \
          libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libglibd-2.0-0 libnss3 \
          libpango-1.0-0 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2; \
        apt install -y fonts-noto fonts-dejavu fonts-font-awesome fonts-adobe-sourcesans3 fonts-firacode fonts-hack; \
      fi \
    fi

# 让函数框架监听到 80 端口
# 目前 cli 部署镜像时默认容器内在 80 起服务
ENV PORT 80

