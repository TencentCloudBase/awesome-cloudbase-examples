#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CloudBaseDataModel,
  loadDotenv,
  mask,
} from '../cloudfunctions/templates-sync/scripts/lib/cloudbase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const APPLY_LOCAL = args.has('--local');
const APPLY_REMOTE = args.has('--remote');
const DRY_RUN = args.has('--dry-run') || (!APPLY_LOCAL && !APPLY_REMOTE);

const ASSETS = {
  basic: {
    images: [
      'crunbuild.tencentcloudcr.com/cloudbase/cbrf-template-basic-example:1.0.0',
      'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-basic-example:1.0.0',
    ],
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/nodejs-cbrf-template-basic-example.zip',
  },
  gin: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-gin-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-gin-example.zip',
    port: 8080,
  },
  django: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-django-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-django-example.zip',
    port: 8080,
  },
  flask: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-flask-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-flask-example.zip',
    port: 8080,
  },
  springboot: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-springboot-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-springboot-example.zip',
    port: 8080,
  },
  express: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-express-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-express-example.zip',
    port: 3000,
  },
  nestjs: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-nestjs-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-nestjs-example.zip',
    port: 3000,
  },
  nextjs: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-nextjs-example:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/languages-frameworks/cbrf-template-nextjs-example.zip',
    port: 3000,
  },
  funcV2: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/func-v2-template:v1.0.0',
    zip: 'https://clooudbaserun-az-1258016615.cos.ap-shanghai.myqcloud.com/templates/func-v2-template.zip',
    port: 3000,
  },
  yuanqiAgent: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-yuanqi-agent:0.0.1',
    zip: 'https://tcb.cloud.tencent.com/cloud-run-function-template/cloudbase-custom-yuanqi-agent.zip',
  },
  lkeAgent: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-lke-agent:0.0.1',
    zip: 'https://tcb.cloud.tencent.com/cloud-run-function-template/lke-agent.zip',
  },
  cloudbaseAgent: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-cloudbase-agent:0.0.6',
    zip: 'https://tcb.cloud.tencent.com/cloud-run-function-template/cloudbase-agent.zip',
    port: 9000,
  },
  langchainTs: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-langchain-ts:v0.0.1',
    zip: 'https://scf-template-1307578329.cos.ap-guangzhou.myqcloud.com/langchain-js.zip',
    port: 9000,
  },
  langgraphPy: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-langgraph-python:v0.0.1',
    zip: 'https://scf-template-1307578329.cos.ap-guangzhou.myqcloud.com/langgraph-python.zip',
    port: 9000,
  },
  langgraphTs: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-langgraph-ts:v0.0.1',
    zip: 'https://scf-template-1307578329.cos.ap-guangzhou.myqcloud.com/langgraph-js.zip',
    port: 9000,
  },
  crewaiPy: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-crewai-python:v0.0.1',
    zip: 'https://scf-template-1307578329.cos.ap-guangzhou.myqcloud.com/crewai-python.zip',
    port: 9000,
  },
  cozePyLegacy: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-coze-python-agent:latest',
    zip: 'https://tcb-1258344699.cos.ap-shanghai.myqcloud.com/cloud-run-function-template/coze-agent.zip',
  },
  adkPy: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-adk-python:latest',
    zip: 'https://tcb-1258344699.cos.ap-shanghai.myqcloud.com/cloud-run-function-template/adk-python.zip',
    port: 9000,
  },
  adpJs: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/cloudrun-agent-adp-js:latest',
    zip: 'https://tcb.cloud.tencent.com/cloud-run-function-template/adp-js.zip',
  },
  yuanqiJsLatest: {
    image: 'crunbuild-az-new.tencentcloudcr.com/cloudbase/yuanqi-js:latest',
    zip: 'https://tcb.cloud.tencent.com/cloud-run-function-template/yuanqi-js.zip',
  },
};

const LOCAL_TARGETS = {
  'cloudfunctions/http-go-gin': ASSETS.gin,
  'cloudfunctions/http-python-django': ASSETS.django,
  'cloudfunctions/http-python-flask': ASSETS.flask,
  'cloudfunctions/http-java-springboot': ASSETS.springboot,
  'cloudfunctions/http-nodejs-express': ASSETS.express,
  'cloudfunctions/http-nodejs-nestjs': ASSETS.nestjs,
  'cloudbaserun/python-django': ASSETS.django,
  'cloudbaserun/python-flask': ASSETS.flask,
  'cloudbaserun/java-springboot': ASSETS.springboot,
  'cloudbaserun/nodejs-express': ASSETS.express,
  'cloudbaserun/nodejs-nextjs': ASSETS.nextjs,
};

const REMOTE_IDENTIFIER_TARGETS = {
  'http-go-gin': ASSETS.gin,
  'http-python-django': ASSETS.django,
  'http-python-flask': ASSETS.flask,
  'http-java-springboot': ASSETS.springboot,
  'http-nodejs-express': ASSETS.express,
  'http-nodejs-nestjs': ASSETS.nestjs,
  'python-django': ASSETS.django,
  'python-flask': ASSETS.flask,
  'java-springboot': ASSETS.springboot,
  'nodejs-express': ASSETS.express,
  'nodejs-nextjs': ASSETS.nextjs,
  springboot: ASSETS.springboot,
  'Next.js': ASSETS.nextjs,
  express: ASSETS.express,
  nestjs: ASSETS.nestjs,
  django: ASSETS.django,
  flask: ASSETS.flask,
};

const IMAGE_TO_ASSET = new Map();
for (const asset of Object.values(ASSETS)) {
  const images = asset.images || [asset.image];
  for (const image of images) {
    if (image) IMAGE_TO_ASSET.set(image, asset);
  }
}

const FIELD_ORDER = [
  'identifier', 'lang', 'funcTypes',
  'title', 'titleIcon', 'description', 'tags', 'sampleCode',
  'language', 'runtimeVersion', 'isCompile', 'entryPoint',
  'zipFilePath', 'zipFileStore',
  'imagePath', 'containerPort',
  'envParams', 'linkurl', 'guide',
  'targetPlatform',
  'gitUrl', 'gitUrlList',
  'displayPage', 'category', 'scfDemoID',
  '_source',
];

function orderFields(obj) {
  const out = {};
  for (const key of FIELD_ORDER) {
    if (key in obj) out[key] = obj[key];
  }
  for (const key of Object.keys(obj).sort()) {
    if (!(key in out) && key !== '_source') out[key] = obj[key];
  }
  if ('_source' in obj && !('_source' in out)) out._source = obj._source;
  return out;
}

function patchJson(json, asset, { setImage }) {
  const next = { ...json };
  if (setImage && asset.image) next.imagePath = asset.image;
  next.zipFilePath = asset.zip;
  next.zipFileStore = '';
  if (asset.port) next.containerPort = asset.port;

  next._source = { ...(json._source || {}) };
  next._source.zipFilePath = asset.zip;
  next._source.zipSha = '';
  next._source.uploadedAt = 0;
  return orderFields(next);
}

function updateLocal() {
  const changed = [];
  const skipped = [];
  for (const [dir, asset] of Object.entries(LOCAL_TARGETS)) {
    for (const file of ['cloudbase-template.json', 'cloudbase-template.en.json']) {
      const path = join(ROOT, dir, file);
      if (!existsSync(path)) {
        skipped.push(`${dir}/${file}`);
        continue;
      }
      const json = JSON.parse(readFileSync(path, 'utf8'));
      const next = patchJson(json, asset, { setImage: true });
      const before = JSON.stringify(json, null, 2) + '\n';
      const after = JSON.stringify(next, null, 2) + '\n';
      if (before !== after) {
        changed.push(`${dir}/${file}`);
        if (APPLY_LOCAL) writeFileSync(path, after, 'utf8');
      }
    }
  }
  console.log(`${APPLY_LOCAL ? '[LOCAL]' : '[DRY-LOCAL]'} changed=${changed.length}`);
  for (const item of changed) console.log(`  ${item}`);
  if (skipped.length) {
    console.log(`  skipped missing files=${skipped.length}`);
    for (const item of skipped) console.log(`  - ${item}`);
  }
}

function chooseRemoteAsset(record) {
  const image = String(record.imagePath || '').trim();
  if (IMAGE_TO_ASSET.has(image)) return IMAGE_TO_ASSET.get(image);
  if (!image && REMOTE_IDENTIFIER_TARGETS[record.identifier]) {
    return REMOTE_IDENTIFIER_TARGETS[record.identifier];
  }
  return null;
}

function buildRemotePatch(record, asset) {
  const data = {};
  if (record.zipFilePath !== asset.zip) data.zipFilePath = asset.zip;
  if (String(record.zipFileStore || '').trim()) data.zipFileStore = '';
  if (!String(record.imagePath || '').trim() && asset.image) data.imagePath = asset.image;
  if (asset.port && record.containerPort !== asset.port) data.containerPort = asset.port;
  return data;
}

function hasRemoteChange(record, data) {
  return Object.entries(data).some(([key, value]) => record[key] !== value);
}

async function updateRemote() {
  loadDotenv();
  const envId = process.env.TEMPLATE_ENV_ID;
  const modelName = process.env.TEMPLATE_MODEL_ID || 'tcb_template_list';
  const apiKey = process.env.CLOUDBASE_APIKEY;
  if (!envId || !modelName || !apiKey) {
    throw new Error('TEMPLATE_ENV_ID, TEMPLATE_MODEL_ID, and CLOUDBASE_APIKEY must be set');
  }

  const dm = new CloudBaseDataModel({ envId, modelName, apiKey, timeoutMs: 60000 });
  console.log(`${APPLY_REMOTE ? '[REMOTE]' : '[DRY-REMOTE]'} envId=${envId} model=${modelName} apiKey=${mask(apiKey)}`);
  const { records, total } = await dm.listAll({ pageSize: 100 });
  console.log(`  fetched=${records.length} total=${total}`);

  const changes = [];
  for (const record of records) {
    const asset = chooseRemoteAsset(record);
    if (!asset) continue;
    const data = buildRemotePatch(record, asset);
    if (!hasRemoteChange(record, data)) continue;
    changes.push({ record, data });
  }

  console.log(`  changes=${changes.length}`);
  for (const { record, data } of changes) {
    const label = `${record.identifier}/${record.lang || ''}/${record._id}`;
    console.log(`  ${label}`);
    console.log(`    ${JSON.stringify(data)}`);
    if (APPLY_REMOTE) {
      await dm.update({ where: { _id: { $eq: record._id } } }, data);
    }
  }
}

function printUncoveredLocalCloudRun() {
  const covered = new Set(Object.keys(LOCAL_TARGETS).filter((p) => p.startsWith('cloudbaserun/')).map((p) => p.slice('cloudbaserun/'.length)));
  const all = [
    'go-helloworld',
    'nodejs-helloworld',
    'nodejs-koa',
    'nodejs-nuxt',
    'nodejs-websocket',
    'php-helloworld',
    'php-laravel',
    'python-helloworld',
    'python-sse',
    'strapi',
  ];
  const uncovered = all.filter((id) => !covered.has(id));
  console.log(`uncovered cloudbaserun identifiers=${uncovered.length}`);
  for (const id of uncovered) console.log(`  ${id}`);
}

async function main() {
  if (DRY_RUN) console.log('[DRY-RUN] pass --local and/or --remote to write changes');
  updateLocal();
  printUncoveredLocalCloudRun();
  if (APPLY_REMOTE || DRY_RUN) await updateRemote();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
